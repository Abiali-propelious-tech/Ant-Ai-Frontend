"use client";
import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

// --- Types ---
type Tag = {
  id: string;
  name: string;
  [key: string]: any;
};

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

import { useJwt } from "@/context/JwtContext";
import { useParams } from "next/navigation";
import { send } from "process";

function ChatPage() {
  // Chat UI state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sending, setSending] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(true); // Default to true to show loader initially
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedSingleModelId, setSelectedSingleModelId] = useState<
    string | null
  >(null);
  const [selectedBatchModelId, setSelectedBatchModelId] = useState<
    string | null
  >(null);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const params = useParams();
  const fileId = useMemo(() => params.id, [params]);
  console.log("🚀 ~ page.tsx:45 ~ ChatPage ~ params:", params.id);
  const { jwt } = useJwt();
  // Fetch conversation and messages
  useEffect(() => {
    if (!jwt || !fileId) return;
    setGlobalError(null);
    const historyUrl = `http://localhost:8000/api/v1/chat/history/${fileId}?page=1&limit=50`;
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
            body: JSON.stringify({ fileId }),
          })
            .then((postRes) => postRes.json())
            .then((postData) => {
              if (postData.status === "success" && postData.conversationId) {
                setConversationId(postData.conversationId);
                setChatMessages([]);
              }
            });
        } else {
          // If found, set conversationId and messages from response
          const data = await res.json();
          if (data && data.conversationId) {
            setConversationId(data.conversationId);
            setChatMessages(data.messages || []);
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
  // Send chat message or generate summary
  const handleSendChat = async (type: "message" | "summary") => {
    if (!conversationId || !jwt) return;

    // For message type, check if there's input text
    if (type === "message" && !chatInput.trim()) return;

    // For summary type, check if there's a selected prompt
    if (type === "summary" && !selectedPromptId) return;

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

    setGlobalError(null);
    const chatUrl = "http://localhost:8000/api/v1/chat/chat";

    let payload;
    if (type === "message") {
      payload = {
        message: chatInput,
        modelId: "7404688b-ff16-4677-a70a-ffe88fdf03ce",
        conversationId,
      };
    } else {
      // type === "summary"
      payload = {
        promptId: selectedPromptId,
        modelId: "7404688b-ff16-4677-a70a-ffe88fdf03ce",
        conversationId,
      };
    }

    // Clear input after adding human message
    if (type === "message") {
      setChatInput("");
    }

    try {
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data && data.status === "success") {
        // Only add AI response to chatMessages
        setChatMessages((prev) => [
          ...prev,
          {
            Id: data.messageId,
            Content: data.response,
            MessageType: type === "message" ? "ai_message" : "ai_summary",
          },
        ]);
      } else {
        setGlobalError(data?.detail || "API error.");
      }
    } catch (err) {
      setGlobalError("Network/API error.");
    } finally {
      setSending(false);
      setSendingMessage(false);
      setGlobalLoading(false);
    }
  };

  // Fetch tags on mount
  useEffect(() => {
    if (!jwt) return;
    setLoadingTags(true);
    const filters = [["IsActive", true]];
    const filtersJson = encodeURIComponent(JSON.stringify(filters));
    const tagsUrl = `http://localhost:8000/api/v1/tags/?page=1&limit=20&sort_by=Id&sort_order=asc`;
    fetch(tagsUrl, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setTags(data);
        if (data && data.length > 0) {
          setSelectedTag(data[0]);
        }
      })
      .catch(() => {
        setGlobalError("Failed to load tags.");
      })
      .finally(() => {
        setLoadingTags(false);
      });
  }, [jwt]);

  // Fetch prompts when selectedTag changes
  useEffect(() => {
    if (!selectedTag || !jwt) return;
    setLoadingPrompts(true);
    fetch(
      `http://localhost:8000/api/v1/prompt-templates/by-tag/${selectedTag.Id}`,
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
  }, [selectedTag, jwt]);

  if (loadingTags || loadingPrompts) {
    return (
      <div style={{ textAlign: "center", margin: "24px 0", fontWeight: 600 }}>
        Loading chat...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
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

      {/* Tag pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tags?.map((tag) => (
          <button
            key={tag.Id}
            onClick={() => setSelectedTag(tag)}
            style={{
              borderRadius: 999,
              padding: "6px 18px",
              border:
                selectedTag?.Id === tag.Id
                  ? "2px solid #0070f3"
                  : "1px solid #ccc",
              background: selectedTag?.Id === tag.Id ? "#e6f0ff" : "#f5f5f5",
              color: selectedTag?.Id === tag.Id ? "#0070f3" : "#222",
              fontWeight: selectedTag?.Id === tag.Id ? 600 : 400,
              cursor: "pointer",
              outline: "none",
              transition: "all 0.2s",
            }}
          >
            {tag.Name}
          </button>
        ))}
      </div>

      {/* Select prompt template and AI model */}
      <div style={{ display: "flex", gap: "5%", marginBottom: 16 }}>
        <div
          style={{ flex: "0 0 65%", display: "flex", flexDirection: "column" }}
        >
          <label
            htmlFor="prompt-select"
            style={{ fontWeight: 500, marginBottom: 6 }}
          >
            Select Prompt Template:
          </label>
          {loadingPrompts ? (
            <div style={{ textAlign: "center", fontWeight: 600 }}>
              Loading prompts...
            </div>
          ) : (
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
          )}
        </div>
        <div
          style={{ flex: "0 0 30%", display: "flex", flexDirection: "column" }}
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
              !prompts.find((p) => p.id === selectedPromptId)?.single_model_list
                ?.length
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

      {/* Generate Summary Button */}
      <div style={{ marginBottom: 24 }}>
        <button
          style={{
            padding: "14px 0",
            borderRadius: 8,
            background: conversationId && selectedPromptId ? "#0070f3" : "#ccc",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            width: "100%",
            display: "block",
          }}
          disabled={!conversationId || !selectedPromptId || sending}
          onClick={() => handleSendChat("summary")}
        >
          {sending ? "Generating..." : "Generate Summary"}
        </button>
      </div>

      {/* Chat UI */}
      <div
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
        ) : chatMessages.length === 0 ? (
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
                  maxWidth: "70%",
                  fontSize: 15,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  wordBreak: "break-word",
                }}
              >
                {msg.MessageType === "ai_message" ||
                msg.MessageType === "ai_summary" ? (
                  <ReactMarkdown>{msg.Content}</ReactMarkdown>
                ) : (
                  msg.Content
                )}
              </div>
            </div>
          ))
        )}
        {sendingMessage && (
          <div
            style={{
              background: "#fff3cd",
              color: "#222",
              borderRadius: 12,
              padding: "8px 16px",
              maxWidth: "70%",
              fontSize: 15,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              wordBreak: "break-word",
            }}
          >
            loading...
          </div>
        )}
      </div>
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
      </div>
    </div>
  );
}

export default ChatPage;
