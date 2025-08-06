"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Types ---
type Model = {
  id: string;
  modal_name: string;
  provider_name: string;
};

type PromptTemplate = {
  id: string;
  name: string;
  prompt: string;
  description: string;
  single_model_list: Model[];
  batch_model_list: Model[];
  [key: string]: any;
};

interface CitationMetadata {
  speaker: string;
  turn_id: string;
  end_time: number;
  start_time: number;
  turn_index: number;
}

interface Citation {
  source: string;
  metadata: CitationMetadata[];
}

import { useJwt } from "@/context/JwtContext";
import { useParams } from "next/navigation";
import { send } from "process";
import { use } from "react";

function ChatPage() {
  // Chat UI state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sending, setSending] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(true); // Default to true to show loader initially
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedSingleModelId, setSelectedSingleModelId] = useState<
    string | null
  >(null);
  const [selectedBatchModelId, setSelectedBatchModelId] = useState<
    string | null
  >(null);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingData, setStreamingData] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Auto-scroll ref
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const params = useParams();
  const fileId = useMemo(() => params.id as string, [params]);
  console.log("🚀 ~ page.tsx:45 ~ ChatPage ~ params:", params.id);
  const { jwt } = useJwt();
  // Fetch conversation and messages
  useEffect(() => {
    if (!jwt || !fileId) return;
    setGlobalError(null);
    const historyUrl = `http://localhost:8000/api/v1/chat/history?file_id=${fileId}&page=1&limit=50`;
    fetch(historyUrl, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    })
      .then(async (res) => {
        if (res.status === 404) {
          // If not found, create conversation
          const postUrl = "http://localhost:8000/api/v1/chat/conversation";
          return fetch(postUrl, {
            method: "POST",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ fileIds: [fileId] }),
          })
            .then((postRes) => postRes.json())
            .then((postData) => {
              if (postData.status === "success" && postData.conversationId) {
                setConversationId(postData.conversationId);
                setChatMessages([]);
                return postData.conversationId;
              }
            });
        } else {
          // If found, set conversationId and messages from response
          const data = await res.json();
          if (data && data.conversationId) {
            setConversationId(data.conversationId);
            setChatMessages(data.messages || []);
            return data.conversationId;
          }
        }
      })

      .catch((err) => {
        setGlobalError("Failed to load chat history.");
      })
      .finally(() => {
        setGlobalLoading(false);
      });
  }, [jwt, fileId]);

  // Fetch prompts function (called after conversation is established)
  const fetchPrompts = async (convId: string) => {
    if (!jwt) return;
    setLoadingPrompts(true);
    fetch(
      `http://localhost:8000/api/v1/prompt-templates/conversation/${convId}`,
      {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        setPrompts(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedPromptId(data[0].id);
          setSelectedSingleModelId(data[0].single_model_list?.[0]?.id || null);
          setSelectedBatchModelId(data[0].batch_model_list?.[0]?.id || null);
        } else {
          setSelectedPromptId(null);
          setSelectedSingleModelId(null);
          setSelectedBatchModelId(null);
        }
      })
      .catch(() => {
        setGlobalError("Failed to load prompts.");
      })
      .finally(() => {
        setLoadingPrompts(false);
      });
  };
  // Send chat message or generate summary with SSE streaming
  const handleSendChat = async (type: "message" | "summary") => {
    if (!conversationId || !jwt) return;

    // For message type, check if there's input text
    if (type === "message" && !chatInput.trim()) return;

    // For summary type, check if there's a selected prompt
    if (type === "summary" && !selectedPromptId) return;

    // Cancel any existing stream
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    // Add human message to chat before sending (only for message type)
    if (type === "message") {
      setSendingMessage(true);
      setChatMessages((prev) => [
        ...prev,
        {
          Id: Math.random().toString(),
          Content: chatInput,
          MessageType: "human_message",
        },
      ]);
    } else {
      setSending(true);
    }

    setIsStreaming(true);
    setStreamingData("");
    setCitations([]);
    setSuggestedQuestions([]);
    setGlobalError(null);

    // Clear input after adding human message
    if (type === "message") {
      setChatInput("");
    }

    let fullText = "";
    let currentCitations: Citation[] = [];

    try {
      let url: string;
      if (type === "message") {
        url = `http://localhost:8000/api/v1/chat/chat?model_id=7404688b-ff16-4677-a70a-ffe88fdf03ce&conversation_id=${conversationId}&query=${encodeURIComponent(chatInput)}`;
      } else {
        url = `http://localhost:8000/api/v1/chat/chat?model_id=7404688b-ff16-4677-a70a-ffe88fdf03ce&conversation_id=${conversationId}&prompt_id=${selectedPromptId}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          Authorization: `Bearer ${jwt}`,
        },
        signal: newAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === "") continue;

          if (line.startsWith("data: ")) {
            const data = line.slice(6); // Remove 'data: ' prefix
            console.log("data:", data);

            if (data === "[DONE]") {
              console.log("Stream completed successfully");

              // Add AI response to messages with citations and suggestions
              setChatMessages((prev) => [
                ...prev,
                {
                  Id: Math.random().toString(),
                  Content: fullText,
                  MessageType: type === "message" ? "ai_message" : "ai_summary",
                  Citations: currentCitations,
                  SuggestedQuestions: suggestedQuestions,
                },
              ]);

              if (type === "summary") {
                fetchPrompts(conversationId);
              }

              // Keep citations and suggestions visible after stream ends
              setIsStreaming(false);
              setAbortController(null);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              console.log("parsed:", parsed);

              if (parsed.status === "error") {
                toast.error(parsed.error || "An error occurred");
                setIsStreaming(false);
                setAbortController(null);
                return;
              } else if (parsed.status === "success") {
                fullText += parsed.data;
                setStreamingData(fullText);
              } else if (parsed.status === "citations") {
                const newCitations = parsed.data || [];
                currentCitations = newCitations;
                setCitations(newCitations);
              } else if (parsed.status === "suggestions") {
                const suggestions = Array.isArray(parsed.data)
                  ? parsed.data
                  : typeof parsed.data === "string"
                  ? parsed.data
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter((s: string) => s.length > 0)
                  : [];
                setSuggestedQuestions(suggestions);
              }
            } catch (err) {
              console.error("Failed to parse event data:", data, err);
              // Don't break the stream for parse errors, just log them
            }
          } else if (line.startsWith("event: ")) {
            // Handle event type lines if needed
            const eventType = line.slice(7);
            if (eventType === "done") {
              console.log("Received done event");
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Stream was cancelled");
        return;
      }

      console.error("Streaming error:", error);
      toast.error("Connection to server failed: " + error.message);
      setGlobalError("Network/API error.");
    } finally {
      setIsStreaming(false);
      setSending(false);
      setSendingMessage(false);
      setGlobalLoading(false);
      setAbortController(null);
    }
  };

  // Fetch tags on mount

  // Fetch prompts when conversationId is available
  useEffect(() => {
    if (!jwt || !conversationId) return;
    fetchPrompts(conversationId);
  }, [jwt, conversationId]);

  // Auto-scroll function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Auto-scroll when streaming data updates
  useEffect(() => {
    if (isStreaming && streamingData) {
      scrollToBottom();
    }
  }, [streamingData, isStreaming]);

  // Auto-scroll when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);



  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
      <h2>AI Research Assistant</h2>
      {globalError && (
        <div
          style={{
            textAlign: "center",
            margin: "24px 0",
            color: "#d32f2f",
            fontWeight: 600,
          }}
        >
          {globalError}
        </div>
      )}



      {/* Select prompt template and AI model */}

      {loadingPrompts ? (
        <div style={{ textAlign: "center", fontWeight: 600 }}>
          Loading prompts...
        </div>
      ) : (
        <div style={{ display: "flex", gap: "5%", marginBottom: 16 }}>
          <div
            style={{
              flex: "0 0 65%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              htmlFor="prompt-select"
              style={{ fontWeight: 500, marginBottom: 6 }}
            >
              Select Prompt Template:
            </label>

            <select
              id="prompt-select"
              value={selectedPromptId || ""}
              onChange={(e) => {
                setSelectedPromptId(e.target.value);
                const prompt = prompts.find((p) => p.id === e.target.value);
                setSelectedSingleModelId(
                  prompt?.single_model_list?.[0]?.id || null
                );
                setSelectedBatchModelId(
                  prompt?.batch_model_list?.[0]?.id || null
                );
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                width: "100%",
              }}
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              flex: "0 0 30%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label
              htmlFor="model-select"
              style={{ fontWeight: 500, marginBottom: 6 }}
            >
              Select AI Model:
            </label>
            <select
              id="model-select"
              value={selectedSingleModelId || ""}
              onChange={(e) => setSelectedSingleModelId(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                width: "100%",
              }}
              disabled={
                !prompts.find((p) => p.id === selectedPromptId)
                  ?.single_model_list?.length
              }
            >
              {(
                prompts.find((p) => p.id === selectedPromptId)
                  ?.single_model_list || []
              ).length > 0 ? (
                prompts
                  .find((p) => p.id === selectedPromptId)!
                  .single_model_list.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.modal_name} ({m.provider_name})
                    </option>
                  ))
              ) : (
                <option value="">No models</option>
              )}
            </select>
          </div>
        </div>
      )}

      {/* Generate Summary Button */}
      <div style={{ marginBottom: 24 }}>
        <button
          style={{
            padding: "14px 0",
            borderRadius: 8,
            background:
              !conversationId || !selectedPromptId || sending || loadingPrompts
                ? "#ccc"
                : "#0070f3",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            width: "100%",
            display: "block",
          }}
          disabled={
            !conversationId || !selectedPromptId || sending || loadingPrompts
          }
          onClick={() => handleSendChat("summary")}
        >
          {sending ? "Generating..." : "Generate Summary"}
        </button>
      </div>

      {/* Chat UI */}
      <div
        ref={chatContainerRef}
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
          height: 350,
          overflowY: "auto",
          background: "#fafbfc",
          marginBottom: 16,
        }}
      >
        {globalLoading ? (
          <div>Loading..</div>
        ) : chatMessages.length === 0 && !isStreaming ? (
          <div style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
            No messages yet.
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.Id}
              style={{
                display: "flex",
                justifyContent:
                  msg.MessageType === "human_message"
                    ? "flex-end"
                    : "flex-start",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  background:
                    msg.MessageType === "human_message"
                      ? "#e6f0ff"
                      : msg.MessageType === "ai_summary"
                      ? "#fff3cd"
                      : "#f5f5f5",
                  color: "#222",
                  borderRadius: 12,
                  padding: "8px 16px",
                  maxWidth: msg.MessageType === "ai_summary" ? "100%" : "70%",
                  fontSize: 15,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  wordBreak: "break-word",
                }}
              >
                {msg.MessageType === "ai_message" ||
                msg.MessageType === "ai_summary" ? (
                  <>
                    <ReactMarkdown>{msg.Content}</ReactMarkdown>
                    {msg.Citations && msg.Citations.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee" }}>
                        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Citations:</div>
                        <ul style={{ fontSize: 12, color: "#666", margin: 0, paddingLeft: 16 }}>
                          {msg.Citations.map((citation: Citation, index: number) => (
                            <li key={index}>
                              <strong>Source:</strong> {citation.source}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </>
                ) : (
                  msg.Content
                )}
              </div>
            </div>
          ))
        )}
        {/* Streaming message */}
        {isStreaming && streamingData && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: "#fff3cd",
                color: "#222",
                borderRadius: 12,
                padding: "8px 16px",
                maxWidth: "100%",
                fontSize: 15,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                wordBreak: "break-word",
              }}
            >
              <ReactMarkdown>{streamingData}</ReactMarkdown>
              {citations.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee" }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Citations:</div>
                  <ul style={{ fontSize: 12, color: "#666", margin: 0, paddingLeft: 16 }}>
                    {citations.map((citation, index) => (
                      <li key={index}>
                        <strong>Source:</strong> {citation.source}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Loading indicator */}
        {(sendingMessage || sending || isStreaming) && !streamingData ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: "#f5f5f5",
                color: "#222",
                borderRadius: 12,
                padding: "8px 16px",
                maxWidth: "70%",
                fontSize: 15,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                wordBreak: "break-word",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <div style={{ width: 8, height: 8, backgroundColor: "#666", borderRadius: "50%", animation: "bounce 1s infinite" }}></div>
                  <div style={{ width: 8, height: 8, backgroundColor: "#666", borderRadius: "50%", animation: "bounce 1s infinite", animationDelay: "0.1s" }}></div>
                  <div style={{ width: 8, height: 8, backgroundColor: "#666", borderRadius: "50%", animation: "bounce 1s infinite", animationDelay: "0.2s" }}></div>
                </div>
                <span style={{ fontSize: 14, color: "#666" }}>AI is thinking...</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Suggested Questions Section - Above Input Bar */}
      {suggestedQuestions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setChatInput(question)}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: 13,
                  color: "#333",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                  maxWidth: "300px",
                  wordBreak: "break-word",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e9e9e9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
          disabled={sending}
        />
        {isStreaming ? (
          <button
            onClick={() => {
              if (abortController) {
                abortController.abort();
              }
            }}
            style={{
              padding: "10px 22px",
              borderRadius: 8,
              background: "#dc3545",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => handleSendChat("message")}
            disabled={sending || !chatInput.trim() || !conversationId}
            style={{
              padding: "10px 22px",
              borderRadius: 8,
              background: conversationId ? "#0070f3" : "#ccc",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: 16,
              cursor: sending || !chatInput.trim() ? "not-allowed" : "pointer",
            }}
          >
            {sendingMessage ? "Sending..." : "Send"}
          </button>
        )}
      </div>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default ChatPage;
