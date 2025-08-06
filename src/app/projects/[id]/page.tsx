"use client";
import { useJwt } from "@/context/JwtContext";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

interface AudioItem {
  id: string;
  userFileName: string;
  createdOn: string;
  dueDate: string;
  foreignLanguage: string;
  audioLanguage: string;
  transcription: string;
  status: string;
  duration: string | null;
  firstName: string;
  lastName: string;
  fileUrl: string;
  transcriptionType: number;
  linkToDownload: string;
  notes: string;
  isTranscriptAvailable: boolean;
  verbatimTranscription: boolean;
  pii: boolean;
  timestamps: boolean;
  managedService: boolean;
  type: string;
  uploadedBy: string;
  statusTxt: string;
  mediaFile: string;
  isShared: boolean;
  tags: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ProjectAudioListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [audioList, setAudioList] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    audio_prompt: null as File | null,
    text: "",
    cfg_weight: "",
    exaggeration: "",
    project_id: "",
  });
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string[]>([]);
  
  // Chat UI state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sending, setSending] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedSingleModelId, setSelectedSingleModelId] = useState<string | null>(null);
  const [selectedBatchModelId, setSelectedBatchModelId] = useState<string | null>(null);
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
  
  const router = useRouter();
  const { jwt } = useJwt();
  
  useEffect(() => {
    const fetchAudioList = async () => {
      setLoading(true);
      setError(null);
      try {
        const resolvedParams = await params;
        const res = await fetch(
          "https://transcriptionclient2api.datagainservices.com/api/Project/ProjectAudioListGrid",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              // TODO: Use JWT from context if needed
              authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({
              page: 1,
              rowNumber: 15,
              sortRowName: "createdOn",
              sortRowDirection: "desc",
              search: "",
              statusSearch: "",
              languageSearch: "",
              serviceSearch: "",
              transcriptSearch: "",
              dueDateSearch: "",
              createdDateSearch: "",
              projectId: resolvedParams.id,
            }),
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setAudioList(data.value?.listData || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch audio list.");
      } finally {
        setLoading(false);
      }
    };
    
    const fetchConversation = async () => {
      try {
        const resolvedParams = await params;
        const historyUrl = `http://localhost:8000/api/v1/chat/history?project_id=${resolvedParams.id}`;
        
        const res = await fetch(historyUrl, {
          method: "GET",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${jwt}`,
          },
        });

        if (res.status === 404) {
          // If not found, create conversation
          const postUrl = "http://localhost:8000/api/v1/chat/conversation";
          const postRes = await fetch(postUrl, {
            method: "POST",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ projectId: resolvedParams.id }),
          });
          
          const postData = await postRes.json();
          if (postData.status === "success" && postData.conversationId) {
            setConversationId(postData.conversationId);
            setChatHistory([]);
            setMessages([]);
            setChatMessages([]);
            return;
          }
        } else if (res.ok) {
          const data = await res.json();
          console.log("Chat history loaded:", data);
          setChatHistory(data);
          
          // Set selected audio files if they exist in the response
          if (data.fileIds && Array.isArray(data.fileIds)) {
            setSelectedAudio(data.fileIds);
          }
          
          // Convert chat history to messages format
          const formattedMessages: Message[] = data.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp || Date.now()),
          }));
          setMessages(formattedMessages);
          setChatMessages(data.messages || []);
          setConversationId(data.conversationId);
          console.log("Messages set:", formattedMessages);
        }
      } catch (err: any) {
        console.error("Failed to fetch chat history:", err);
      } finally {
        setGlobalLoading(false);
      }
    };
    
    fetchConversation();
    fetchAudioList();
  }, [params, jwt]);

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

  // Fetch prompts when conversationId is available
  useEffect(() => {
    if (!jwt || !conversationId) return;
    fetchPrompts(conversationId);
  }, [jwt, conversationId]);


  const handleAudioSelection = (id: string) => {
    let updatedSelectedAudio;
    if (selectedAudio.includes(id)) {
      updatedSelectedAudio = selectedAudio.filter(item => item !== id);
    } else {
      updatedSelectedAudio = [...selectedAudio, id];
    }

    setSelectedAudio(updatedSelectedAudio);

    console.log("Selected audio:", updatedSelectedAudio);
    const updateConversation = async () => {
      const res = await fetch("http://localhost:8000/api/v1/chat/update-conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          conversationId: "8F8D276B-9243-40E5-B316-A55AC7B869E6",
          fileIds: updatedSelectedAudio,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      console.log("Conversation updated:", data);
    };
    updateConversation();
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
    <div
      style={{
        padding: 24,
        maxWidth: 1400,
        margin: "0 auto",
        background: "#fff",
        color: "#222",
        minHeight: "100vh",
      }}
    >
      <h2
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        Project Audio List & Chat
      </h2>
      
      <div style={{ 
        display: "flex", 
        gap: 24, 
        height: "calc(100vh - 200px)",
        minHeight: "600px"
      }}>
        {/* Audio List Section */}
        <div style={{ 
          flex: 1, 
          overflow: "auto", 
          border: "1px solid #e0e0e0", 
          borderRadius: 8, 
          padding: "16px",
          background: "#f9f9f9"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#333", fontSize: "18px", fontWeight: "600" }}>Audio Files</h3>
          {loading && (
            <div style={{ color: "#0070f3", textAlign: "center" }}>Loading...</div>
          )}
          {error && (
            <div style={{ color: "#e74c3c", textAlign: "center" }}>
              Error: {error}
            </div>
          )}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#f5f5f5",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              marginTop: 24,
            }}
          >
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Select</th>
                <th style={{ padding: 10, textAlign: "left" }}>ID</th>
                <th style={{ padding: 10, textAlign: "left" }}>File Name</th>
              </tr>
            </thead>
            <tbody>
              {audioList.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={3}
                    style={{ textAlign: "center", padding: 16, color: "#888" }}
                  >
                    No audio files found for this project.
                  </td>
                </tr>
              )}
              {audioList.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: "1px solid #e0e0e0", cursor: "pointer" }}
                  
                >
                  <td style={{ padding: 10 }}>
                    <input type="checkbox" checked={selectedAudio.includes(item.id)} onChange={() => handleAudioSelection(item.id)} disabled={item.status !== "Completed"} />
                  </td>
                  <td style={{ padding: 10 }} onClick={() => router.push(`/chat/${item.id}`)}>{item.id}</td>
                  <td style={{ padding: 10 }}>{item.userFileName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chat Section */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          border: "1px solid #e0e0e0", 
          borderRadius: 8,
          background: "#fff",
          minWidth: "400px"
        }}>
          {/* Chat Header */}
          <div style={{ 
            padding: "16px 20px", 
            borderBottom: "1px solid #e0e0e0", 
            background: "#f8f9fa",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#333" }}>
              Project Chat
            </h3>
          </div>

          {/* Prompt Template and Model Selection */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e0e0e0", background: "#fff" }}>
            {loadingPrompts ? (
              <div style={{ textAlign: "center", fontWeight: 600, color: "#666" }}>
                Loading prompts...
              </div>
            ) : (
              <div style={{ display: "flex", gap: "5%", marginBottom: 16 }}>
                <div style={{ flex: "0 0 65%", display: "flex", flexDirection: "column" }}>
                  <label htmlFor="prompt-select" style={{ fontWeight: 500, marginBottom: 6, fontSize: "14px" }}>
                    Select Prompt Template:
                  </label>
                  <select
                    id="prompt-select"
                    value={selectedPromptId || ""}
                    onChange={(e) => {
                      setSelectedPromptId(e.target.value);
                      const prompt = prompts.find((p) => p.id === e.target.value);
                      setSelectedSingleModelId(prompt?.single_model_list?.[0]?.id || null);
                      setSelectedBatchModelId(prompt?.batch_model_list?.[0]?.id || null);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      width: "100%",
                      fontSize: "14px"
                    }}
                  >
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "0 0 30%", display: "flex", flexDirection: "column" }}>
                  <label htmlFor="model-select" style={{ fontWeight: 500, marginBottom: 6, fontSize: "14px" }}>
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
                      fontSize: "14px"
                    }}
                    disabled={!prompts.find((p) => p.id === selectedPromptId)?.single_model_list?.length}
                  >
                    {(
                      prompts.find((p) => p.id === selectedPromptId)?.single_model_list || []
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
            <div style={{ marginBottom: 16 }}>
              <button
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: !conversationId || !selectedPromptId || sending || loadingPrompts ? "#ccc" : "#0070f3",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  width: "100%",
                  display: "block",
                }}
                disabled={!conversationId || !selectedPromptId || sending || loadingPrompts}
                onClick={() => handleSendChat("summary")}
              >
                {sending ? "Generating..." : "Generate Summary"}
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            style={{ 
              flex: 1, 
              overflowY: "auto", 
              padding: "20px",
              background: "#fafbfc",
              minHeight: "300px"
            }}
          >
            {globalLoading ? (
              <div style={{ textAlign: "center", color: "#666" }}>Loading...</div>
            ) : chatMessages.length === 0 && !isStreaming ? (
              <div style={{ 
                textAlign: "center", 
                color: "#888", 
                marginTop: "40px",
                fontSize: 14
              }}>
                Start a conversation about this project...
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.Id}
                  style={{
                    display: "flex",
                    justifyContent: msg.MessageType === "human_message" ? "flex-end" : "flex-start",
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
                    {msg.MessageType === "ai_message" || msg.MessageType === "ai_summary" ? (
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
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
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
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
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

          {/* Suggested Questions Section */}
          {suggestedQuestions.length > 0 && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid #e0e0e0", background: "#fff" }}>
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

          {/* Input Section */}
          <div style={{ 
            padding: "20px", 
            borderTop: "1px solid #e0e0e0",
            background: "#f8f9fa",
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8
          }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
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
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat("message");
                  }
                }}
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
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
      
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
