"use client";

import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReactMarkdown from "react-markdown";
import {
  Download,
  RotateCcw,
  X,
  MessageSquare,
  BarChart3,
  Key,
  User,
  FileText,
  Send,
  Mic,
  LucideIcon,
} from "lucide-react";

// Type definitions
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: React.ReactNode;
  color?: "blue" | "purple" | "green" | "orange" | "red";
}

interface SuggestedQuestionProps {
  question: string;
  onClick: () => void;
}

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

interface Message {
  type: "user" | "ai";
  content: string;
  timestamp: string;
  citations?: Citation[];
}

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  children,
  color = "blue",
}: TabButtonProps) => {
  const colorClasses: Record<string, string> = {
    blue: active
      ? "bg-blue-500 text-white"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
    purple: active
      ? "bg-purple-500 text-white"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
    green: active
      ? "bg-green-500 text-white"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
    orange: active
      ? "bg-orange-500 text-white"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
    red: active
      ? "bg-red-500 text-white"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${colorClasses[color]}`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
};

const SuggestedQuestion = ({ question, onClick }: SuggestedQuestionProps) => (
  <button
    onClick={onClick}
    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors text-left"
  >
    {question}
  </button>
);

export default function AIResearchAssistant() {
  const [data, setData] = useState<string>("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [activeTab, setActiveTab] = useState("summary");
  const [isStreaming, setIsStreaming] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "What are the main concerns?",
    "Compare different viewpoints",
    "Find contradictions",
    "Who agreed on this topic?",
  ]);

  // AbortController for cancelling requests
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const startStream = async () => {
    if (!query.trim()) return;

    // Cancel any existing stream
    if (abortController) {
      abortController.abort();
    }

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    setIsStreaming(true);
    setData("");
    setCitations([]);

    // Add user message
    const userMessage: Message = {
      type: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMessage]);

    const url = `http://localhost:8000/api/v1/chat/chat?model_id=7404688B-FF16-4677-A70A-FFE88FDF03CE&conversation_id=E566A831-2453-40E7-A425-A683CAEB599E&query=${encodeURIComponent(
      query
    )}`;

    let fullText = "";
    let currentCitations: Citation[] = [];

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ODU0M2IzOS1iYjdiLTRlNjgtODU2Yy1hNWM5MGZiN2JlYWYiLCJqdGkiOiIwNDQ3ZjIwOC0wOGRmLTQ5ZDEtYmFjNC1mYmI3OGNlYmViZWUiLCJVc2VyTmFtZSI6ImFudF9jbGllbnRAZGF0YWdhaW5zZXJ2aWNlcy5jb20iLCJVc2VySWQiOiI0ODU0M2IzOS1iYjdiLTRlNjgtODU2Yy1hNWM5MGZiN2JlYWYiLCJGdWxsTmFtZSI6IkFOVCBDbGllbnRGb3JWZW5kb3IiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJVc2VyIiwiZXhwIjoxNzU0NDY0Nzc2LCJpc3MiOiJodHRwczovL3RyYW5zY3JpcHRpb25jbGllbnQyLmRhdGFnYWluc2VydmljZXMuY29tIiwiYXVkIjoiaHR0cHM6Ly90cmFuc2NyaXB0aW9uY2xpZW50MmFwaS5kYXRhZ2FpbnNlcnZpY2VzLmNvbSJ9.0_Ypn75dfAvPSyx8RbLLkaApxO1fihcn_BBicynTqgU`,
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

            if (data === "[DONE]") {
              console.log("Stream completed successfully");

              // Add AI response to messages
              const aiMessage: Message = {
                type: "ai",
                content: fullText,
                citations: currentCitations,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              };
              setMessages((prev) => [...prev, aiMessage]);

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
                setData(fullText);
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
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }

    setQuery("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setQuery(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startStream();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden min-h-screen">
      {/* Header */}
      <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="text-white" size={18} />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            AI Research Assistant
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <Download size={18} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <RotateCcw size={18} className="text-gray-600" />
          </button>
          <button
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={() => {
              if (abortController) {
                abortController.abort();
              }
            }}
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={activeTab === "summary"}
            onClick={() => setActiveTab("summary")}
            icon={FileText}
            color="blue"
          >
            Quick Summary
          </TabButton>
          <TabButton
            active={activeTab === "thematic"}
            onClick={() => setActiveTab("thematic")}
            icon={BarChart3}
            color="purple"
          >
            Thematic Analysis
          </TabButton>
          <TabButton
            active={activeTab === "keypoints"}
            onClick={() => setActiveTab("keypoints")}
            icon={Key}
            color="green"
          >
            Key Points
          </TabButton>
          <TabButton
            active={activeTab === "speaker"}
            onClick={() => setActiveTab("speaker")}
            icon={User}
            color="orange"
          >
            By Speaker
          </TabButton>
          <TabButton
            active={activeTab === "full"}
            onClick={() => setActiveTab("full")}
            icon={FileText}
            color="red"
          >
            Full Analysis
          </TabButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Messages/Content Area */}
        <div className="h-96 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-3 max-w-3xl ${
                  message.type === "user"
                    ? "bg-blue-500 text-white rounded-br-sm"
                    : "bg-gray-100 rounded-tl-sm"
                }`}
              >
                <div
                  className={`text-sm leading-relaxed ${
                    message.type === "user" ? "text-white" : "text-gray-800"
                  }`}
                >
                  {message.type === "ai" ? (
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold mb-3 mt-4">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-semibold mb-2 mt-4">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold mb-2 mt-3">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        ul: ({ children }) => (
                          <ul className="ml-4 mb-2 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="ml-4 mb-2 space-y-1 list-decimal">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm">{children}</li>
                        ),
                        code: ({ children }) => (
                          <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-gray-200 p-3 rounded mt-2 mb-2 text-xs overflow-x-auto">
                            {children}
                          </pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>

                {message.citations && message.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 mb-2">Citations:</div>
                    <ul className="text-sm text-gray-800 list-disc list-inside space-y-1">
                      {message.citations.map((citation, citationIndex) => (
                        <li key={citationIndex}>
                          <strong>Source:</strong> {citation.source}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  className={`text-xs mt-2 ${
                    message.type === "user" ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Current streaming message */}
          {isStreaming && data && (
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-3xl">
              <div className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mb-3 mt-4">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold mb-2 mt-4">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold mb-2 mt-3">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                    ul: ({ children }) => (
                      <ul className="ml-4 mb-2 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="ml-4 mb-2 space-y-1 list-decimal">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm">{children}</li>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-gray-200 p-3 rounded mt-2 mb-2 text-xs overflow-x-auto">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {data}
                </ReactMarkdown>
              </div>

              {citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600 mb-2">Citations:</div>
                  <ul className="text-sm text-gray-800 list-disc list-inside space-y-1">
                    {citations.map((citation, index) => (
                      <li key={index}>
                        <strong>Source:</strong> {citation.source}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-gray-500 mt-2">
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
              </div>
            </div>
          )}

          {isStreaming && !data && (
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Questions */}
        {!isStreaming && suggestedQuestions.length > 0 && (
          <div className="px-6 py-3 border-t bg-gray-50">
            <div className="text-sm text-gray-600 mb-2">
              Suggested questions:
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question: string, index: number) => (
                <SuggestedQuestion
                  key={index}
                  question={question}
                  onClick={() => handleSuggestedQuestion(question)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={query}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setQuery(e.target.value)
                }
                onKeyPress={handleKeyPress}
                placeholder="Ask about the transcript..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                disabled={isStreaming}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {query.length}/500
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startStream}
                disabled={isStreaming || !query.trim()}
                className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                <Send size={18} />
              </button>
              <button className="p-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors">
                <Mic size={18} />
              </button>
            </div>
          </div>
        </div>
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
