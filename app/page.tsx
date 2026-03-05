"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  prompt: string;
  response: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("conversations");
    if (saved) {
      const parsed = JSON.parse(saved);
      setConversations(parsed);
      if (parsed.length > 0) {
        setCurrentConversationId(parsed[0].id);
      }
    } else {
      createNewConversation();
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem("conversations", JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, currentConversationId]);

  function createNewConversation(): Conversation {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => {
      const updated = [newConv, ...prev];
      localStorage.setItem("conversations", JSON.stringify(updated));
      return updated;
    });
    setCurrentConversationId(newConv.id);
    return newConv;
  }

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  function getCurrentMessages(): ChatMessage[] {
    return currentConversation?.messages || [];
  }

  async function handleSubmit() {
    if (!prompt.trim() || !currentConversationId) return;

    setLoading(true);
    setError(null);

    const userMessage: ChatMessage = {
      prompt,
      response: "",
      timestamp: Date.now(),
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              updatedAt: Date.now(),
              title:
                conv.messages.length === 0
                  ? prompt.slice(0, 30) + (prompt.length > 30 ? "..." : "")
                  : conv.title,
            }
          : conv
      )
    );

    const promptToSend = prompt;
    setPrompt("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToSend }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const aiResponse = data.response;

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? {
                ...conv,
                messages: conv.messages.map((msg, idx) =>
                  idx === conv.messages.length - 1
                    ? { ...msg, response: aiResponse }
                    : msg
                ),
                updatedAt: Date.now(),
              }
            : conv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? {
                ...conv,
                messages: conv.messages.slice(0, -1),
                updatedAt: Date.now(),
              }
            : conv
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    const newConv = createNewConversation();
    setError(null);
    setPrompt("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const newConv: Conversation = {
          id: Date.now().toString(),
          title: "New Chat",
          messages: [],
          updatedAt: Date.now(),
        };
        setCurrentConversationId(newConv.id);
        localStorage.setItem("conversations", JSON.stringify([newConv]));
        return [newConv];
      }
      if (id === currentConversationId) {
        setCurrentConversationId(filtered[0].id);
      }
      localStorage.setItem("conversations", JSON.stringify(filtered));
      return filtered;
    });
  }

  function handleClearCurrent() {
    if (!currentConversationId) return;
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv.id === currentConversationId
          ? { ...conv, messages: [], title: "New Chat", updatedAt: Date.now() }
          : conv
      );
      localStorage.setItem("conversations", JSON.stringify(updated));
      return updated;
    });
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  }

  const messages = getCurrentMessages();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 ease-in-out border-r border-border bg-card overflow-hidden flex flex-col`}
      >
        <div className="p-3 border-b border-border">
          <button
            onClick={handleNewChat}
            className="btn-primary w-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No chat history
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer mb-1 transition-colors ${
                  conv.id === currentConversationId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground flex-shrink-0"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="flex-1 truncate text-sm">{conv.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-all flex-shrink-0"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn-icon"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
            <h1 className="text-base font-semibold">AI Chat</h1>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearCurrent}
              className="btn-ghost text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Clear chat
            </button>
          )}
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !loading && !error ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
              <p className="text-muted-foreground max-w-md">
                Ask me anything! I can help with questions, creative writing,
                analysis, coding, and more.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className="space-y-4">
                  {/* User Message */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary-foreground"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1.5">You</div>
                      <div className="bg-muted rounded-xl px-4 py-2.5">
                        <p className="whitespace-pre-wrap text-sm">{msg.prompt}</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Response */}
                  {msg.response && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-primary-foreground"
                        >
                          <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                          <path d="m4.93 10.93 1.41 1.41" />
                          <path d="M2 18h2" />
                          <path d="M20 18h2" />
                          <path d="m19.07 10.93-1.41 1.41" />
                          <path d="M22 22v-2" />
                          <path d="M16 6h4a2 2 0 0 1 2 2v4" />
                          <path d="M8 6H4a2 2 0 0 0-2 2v4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1.5">AI</div>
                        <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
                          <div className="markdown-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.response}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading State */}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary-foreground"
                    >
                      <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                      <path d="m4.93 10.93 1.41 1.41" />
                      <path d="M2 18h2" />
                      <path d="M20 18h2" />
                      <path d="m19.07 10.93-1.41 1.41" />
                      <path d="M22 22v-2" />
                      <path d="M16 6h4a2 2 0 0 1 2 2v4" />
                      <path d="M8 6H4a2 2 0 0 0-2 2v4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1.5">AI</div>
                    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
                      <div className="space-y-2">
                        <div className="skeleton h-4 rounded w-full"></div>
                        <div className="skeleton h-4 rounded w-5/6"></div>
                        <div className="skeleton h-4 rounded w-4/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-destructive"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-destructive text-sm">
                      {error}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={textareaRef}
                placeholder="Type your message..."
                rows={1}
                value={prompt}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 pr-14 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ maxHeight: "200px" }}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !prompt.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
