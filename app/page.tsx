"use client";

import { useState, useEffect } from "react";

interface ChatMessage {
  prompt: string;
  response: string;
  timestamp: number;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("chatHistory");
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(history));
  }, [history]);

  async function handleSubmit() {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const aiResponse = data.response;
      setResponse(aiResponse);

      setHistory((prev) => [
        { prompt, response: aiResponse, timestamp: Date.now() },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setHistory([]);
    setResponse(null);
    setError(null);
    setPrompt("");
  }

  function loadFromHistory(item: ChatMessage) {
    setPrompt(item.prompt);
    setResponse(item.response);
    setError(null);
  }

  return (
    <div className="container">
      <main>
        <h1>AI Prompt App</h1>

        <textarea
          placeholder="Enter your prompt here..."
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <div className="buttons">
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? "Loading..." : "Submit"}
          </button>
          <button onClick={handleClear} className="clear-btn">
            Clear
          </button>
        </div>

        {error && (
          <div className="error">
            <p>{error}</p>
          </div>
        )}

        {response && (
          <div className="response">
            <h2>Response:</h2>
            <p>{response}</p>
          </div>
        )}

        {history.length > 0 && (
          <section className="history">
            <h2>History</h2>
            <div className="history-list">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="history-item"
                  onClick={() => loadFromHistory(item)}
                >
                  <p className="history-prompt">{item.prompt}</p>
                  <span className="history-time">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
