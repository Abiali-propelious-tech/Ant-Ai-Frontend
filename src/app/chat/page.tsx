"use client";
import React, { useEffect, useState } from "react";

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

function ChatPage() {
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
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const { jwt } = useJwt();

  // Fetch tags on mount
  useEffect(() => {
    if (!jwt) return;
    setLoadingTags(true);
    // Build filters for active tags in a readable way
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
      .finally(() => setLoadingTags(false));
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
          // Set default single and batch model if available
          setSelectedSingleModelId(data[0].single_model_list?.[0]?.id || null);
          setSelectedBatchModelId(data[0].batch_model_list?.[0]?.id || null);
        } else {
          setSelectedPromptId(null);
          setSelectedSingleModelId(null);
          setSelectedBatchModelId(null);
        }
      })
      .finally(() => setLoadingPrompts(false));
  }, [selectedTag, jwt]);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h2>Prompt Tags</h2>
      {loadingTags ? (
        <div>Loading tags...</div>
      ) : (
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
      )}

      <div>
        {loadingPrompts ? (
          <div>Loading prompt templates...</div>
        ) : prompts.length === 0 ? (
          <div>No prompts found.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
              {/* Prompt select dropdown */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <label
                  htmlFor="prompt-select"
                  style={{ fontWeight: 500, marginBottom: 6 }}
                >
                  Select Prompt:
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
                    minWidth: 200,
                  }}
                >
                  {prompts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Single Model select dropdown */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <label
                  htmlFor="single-model-select"
                  style={{ fontWeight: 500, marginBottom: 6 }}
                >
                  Select Single Model:
                </label>
                <select
                  id="single-model-select"
                  value={selectedSingleModelId || ""}
                  onChange={(e) => setSelectedSingleModelId(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    minWidth: 200,
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
                    <option value="">No single models</option>
                  )}
                </select>
              </div>

              {/* Batch Model select dropdown */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <label
                  htmlFor="batch-model-select"
                  style={{ fontWeight: 500, marginBottom: 6 }}
                >
                  Select Batch Model:
                </label>
                <select
                  id="batch-model-select"
                  value={selectedBatchModelId || ""}
                  onChange={(e) => setSelectedBatchModelId(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    minWidth: 200,
                  }}
                  disabled={
                    !prompts.find((p) => p.id === selectedPromptId)
                      ?.batch_model_list?.length
                  }
                >
                  {(
                    prompts.find((p) => p.id === selectedPromptId)
                      ?.batch_model_list || []
                  ).length > 0 ? (
                    prompts
                      .find((p) => p.id === selectedPromptId)!
                      .batch_model_list.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.modal_name} ({m.provider_name})
                        </option>
                      ))
                  ) : (
                    <option value="">No batch models</option>
                  )}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
