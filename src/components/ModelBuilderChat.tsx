"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import ModelPreviewCard from "./ModelPreviewCard";

const transport = new DefaultChatTransport({
  api: "/api/admin/builder/chat",
});

interface ChatSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export default function ModelBuilderChat() {
  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });

  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatSummary[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef(status);
  const busy = status === "streaming" || status === "submitted";

  // Load chat list on mount
  useEffect(() => {
    fetchChatList();
  }, []);

  // Load chat from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlChatId = params.get("chat");
    if (urlChatId) {
      loadChat(urlChatId);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-save when streaming completes
  useEffect(() => {
    if (
      prevStatusRef.current === "streaming" &&
      status === "ready" &&
      messages.length > 0
    ) {
      saveMessages(messages);
    }
    prevStatusRef.current = status;
  }, [status, messages]);

  async function fetchChatList() {
    setSidebarLoading(true);
    try {
      const res = await fetch("/api/admin/builder/chats");
      if (res.ok) setChatList(await res.json());
    } catch {
      // ignore
    } finally {
      setSidebarLoading(false);
    }
  }

  const saveMessages = useCallback(
    async (msgs: typeof messages) => {
      try {
        if (!chatId) {
          // Create new chat
          const firstUserMsg = msgs.find((m) => m.role === "user");
          const title =
            firstUserMsg?.parts
              ?.filter((p) => p.type === "text")
              .map((p) => p.text)
              .join(" ")
              .slice(0, 60) || "New Chat";

          const res = await fetch("/api/admin/builder/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, messages: msgs }),
          });
          if (res.ok) {
            const { id } = await res.json();
            setChatId(id);
            fetchChatList();
          }
        } else {
          // Update existing chat
          await fetch(`/api/admin/builder/chats/${chatId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: msgs }),
          });
          fetchChatList();
        }
      } catch {
        // silent
      }
    },
    [chatId]
  );

  async function loadChat(id: string) {
    try {
      const res = await fetch(`/api/admin/builder/chats/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChatId(id);
        setMessages(data.messages);
      }
    } catch {
      // ignore
    }
  }

  function startNewChat() {
    setChatId(null);
    setMessages([]);
    setInput("");
    // Clear URL param
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function deleteChat(id: string) {
    try {
      await fetch(`/api/admin/builder/chats?id=${id}`, { method: "DELETE" });
      if (chatId === id) startNewChat();
      fetchChatList();
    } catch {
      // ignore
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    sendMessage({ text });
  }

  function formatRelativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col">
        <button
          onClick={startNewChat}
          className="w-full bg-charcoal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-charcoal/90 mb-3"
        >
          + New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sidebarLoading && (
            <div className="text-xs text-medium-gray animate-pulse px-2 py-3">
              Loading...
            </div>
          )}
          {!sidebarLoading && chatList.length === 0 && (
            <div className="text-xs text-medium-gray px-2 py-3">
              No past chats
            </div>
          )}
          {chatList.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-1 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                chatId === chat.id
                  ? "bg-charcoal text-white"
                  : "hover:bg-light-gray text-charcoal"
              }`}
              onClick={() => loadChat(chat.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-medium">{chat.title}</div>
                <div
                  className={`text-[10px] ${chatId === chat.id ? "text-white/60" : "text-medium-gray"}`}
                >
                  {formatRelativeDate(chat.updatedAt)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className={`opacity-0 group-hover:opacity-100 text-xs px-1 rounded hover:bg-red-100 hover:text-red-600 transition-all ${
                  chatId === chat.id
                    ? "text-white/60"
                    : "text-medium-gray"
                }`}
                title="Delete chat"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <div className="text-lg font-medium text-charcoal">
                Model Builder
              </div>
              <p className="text-sm text-medium-gray max-w-md mx-auto">
                Describe what kind of prediction model you want to build. For
                example: &quot;Create a model that heavily weights goaltending
                and defensive metrics&quot; or &quot;Make something like v3 but
                with more emphasis on recent form.&quot;
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs bg-white border border-border-gray text-medium-gray px-3 py-1.5 rounded-lg hover:border-charcoal hover:text-charcoal transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {message.role === "user" && (
                <div className="flex justify-end">
                  <div className="bg-charcoal text-white rounded-xl rounded-br-sm px-4 py-2.5 max-w-lg text-sm">
                    {message.parts
                      ?.filter((p) => p.type === "text")
                      .map((p, i) => (
                        <span key={i}>{p.text}</span>
                      ))}
                  </div>
                </div>
              )}

              {message.role === "assistant" && (
                <div className="space-y-2">
                  {message.parts?.map((part, i) => {
                    if (part.type === "text" && part.text.trim()) {
                      return (
                        <div
                          key={i}
                          className="bg-white border border-border-gray rounded-xl rounded-bl-sm px-4 py-2.5 max-w-lg text-sm text-charcoal prose prose-sm prose-charcoal max-w-none"
                        >
                          <ReactMarkdown>{part.text}</ReactMarkdown>
                        </div>
                      );
                    }

                    if (
                      part.type === "tool-propose_model" &&
                      part.state !== "input-streaming" &&
                      part.input
                    ) {
                      return (
                        <ModelPreviewCard
                          key={i}
                          config={
                            part.input as Parameters<
                              typeof ModelPreviewCard
                            >[0]["config"]
                          }
                          chatId={chatId ?? undefined}
                        />
                      );
                    }

                    if (
                      part.type === "tool-discover_feeds" &&
                      part.state === "output-available" &&
                      part.output
                    ) {
                      const feeds = part.output as Array<{
                        slug: string;
                        name: string;
                        description: string;
                        factorKey: string;
                        factorLabel: string;
                        costPerCall: number;
                        dailyCost: number;
                        isActive: boolean;
                        authEnvVar?: string | null;
                        keySetupUrl?: string | null;
                      }>;
                      return (
                        <div
                          key={i}
                          className="bg-amber-50 border border-amber-200 rounded-xl p-3 my-2 max-w-lg"
                        >
                          <div className="text-xs font-semibold text-amber-800 mb-2">
                            Available Paid Data Feeds
                          </div>
                          <div className="space-y-2">
                            {feeds.map((f) => (
                              <FeedCard key={f.slug} {...f} />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div className="flex gap-1.5 px-4 py-2">
              <div className="w-2 h-2 bg-medium-gray rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-medium-gray rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 bg-medium-gray rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-2">
            {error.message}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 pt-3 border-t border-border-gray"
        >
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !busy) {
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }
            }}
            placeholder="Describe the model you want to build..."
            className="flex-1 border border-border-gray rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-charcoal resize-none overflow-y-auto"
            rows={1}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="bg-charcoal text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-charcoal/90 disabled:opacity-50 self-end"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

interface FeedCardProps {
  slug: string;
  name: string;
  description: string;
  factorKey: string;
  factorLabel: string;
  costPerCall: number;
  dailyCost: number;
  isActive: boolean;
  authEnvVar?: string | null;
  keySetupUrl?: string | null;
}

function FeedCard({
  slug,
  name,
  description,
  factorLabel,
  costPerCall,
  dailyCost,
  isActive,
  authEnvVar,
  keySetupUrl,
}: FeedCardProps) {
  const [currentActive, setCurrentActive] = useState(isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  const needsKey = error === "missing_api_key" || (!!authEnvVar && showKeyInput);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    setWarning(null);
    setSuccessNote(null);

    try {
      const res = await fetch(`/api/admin/feeds/${slug}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (body.error === "missing_api_key") {
          setError("missing_api_key");
          setShowKeyInput(true);
        } else {
          setError(body.error ?? "Activation failed");
        }
        return;
      }

      setCurrentActive(body.isActive);

      if (body.warning) {
        setWarning(body.warning);
      }

      if (body.isActive) {
        setSuccessNote(
          "Data will be available after the next scheduled feed run."
        );
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveKeyAndActivate() {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    setError(null);
    try {
      const keyRes = await fetch(`/api/admin/feeds/${slug}/key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const keyBody = await keyRes.json();
      if (!keyRes.ok) {
        setError(keyBody.error ?? "Failed to save key");
        return;
      }

      const actRes = await fetch(`/api/admin/feeds/${slug}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      const actBody = await actRes.json();
      if (!actRes.ok) {
        setError(actBody.error ?? "Activation failed");
        return;
      }

      setCurrentActive(true);
      setShowKeyInput(false);
      setSuccessNote("Data will be available after the next scheduled feed run.");
    } catch {
      setError("Network error");
    } finally {
      setSavingKey(false);
    }
  }

  return (
    <div className="bg-white rounded-lg p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-charcoal">{name}</span>
        <button
          onClick={handleToggle}
          disabled={loading || showKeyInput}
          aria-label={
            loading
              ? `Toggling ${name}`
              : currentActive
                ? `Deactivate ${name}`
                : `Activate ${name}`
          }
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            loading || showKeyInput ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } ${
            currentActive
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-charcoal text-white hover:bg-charcoal/80"
          }`}
        >
          {loading ? "..." : currentActive ? "Active" : "Activate"}
        </button>
      </div>
      <div className="text-medium-gray mt-0.5">{description}</div>
      <div className="flex flex-wrap gap-3 mt-1 text-[10px]">
        <span className="text-amber-700">Factor: {factorLabel}</span>
        {costPerCall === 0 ? (
          <span className="text-green-700 font-medium">Free</span>
        ) : (
          <>
            <span className="text-amber-700">${costPerCall}/call</span>
            <span className="text-amber-700">~${dailyCost.toFixed(2)}/day</span>
          </>
        )}
      </div>
      {authEnvVar && !currentActive && !showKeyInput && !error && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-medium-gray">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          <span>Requires API key</span>
        </div>
      )}

      {showKeyInput && (
        <div className="mt-1.5 space-y-1.5">
          <div className="text-[10px] text-amber-800 font-medium">
            API key required for {name}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={authEnvVar ?? "API key"}
              className="flex-1 text-[11px] border border-border-gray rounded px-2 py-1 bg-light-gray focus:outline-none focus:border-charcoal font-mono"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveKeyAndActivate(); }}
            />
            <button
              onClick={handleSaveKeyAndActivate}
              disabled={savingKey || !apiKey.trim()}
              className="px-2.5 py-1 rounded text-[10px] font-medium bg-charcoal text-white hover:bg-charcoal/80 disabled:opacity-50 cursor-pointer shrink-0 transition-colors"
            >
              {savingKey ? "..." : "Save & Activate"}
            </button>
          </div>
          {keySetupUrl && (
            <a
              href={keySetupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-accent-blue hover:underline"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Get an API key
            </a>
          )}
        </div>
      )}

      <div role="status" aria-live="polite">
        {error && error !== "missing_api_key" && (
          <div className="mt-1.5 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded">
            {error}
          </div>
        )}
        {warning && (
          <div className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded">
            {warning}
          </div>
        )}
        {successNote && !error && (
          <div className="mt-1.5 text-[10px] text-green-700 bg-green-50 px-2 py-1 rounded">
            {successNote}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Build a defense-first model",
  "Make a model focused on goaltending",
  "Create something like v3 but with more weight on recent form",
  "Build a model that ignores faceoffs and emphasizes shots",
];
