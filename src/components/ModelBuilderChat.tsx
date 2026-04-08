"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";
import ModelPreviewCard from "./ModelPreviewCard";

const transport = new DefaultChatTransport({
  api: "/api/admin/builder/chat",
});

export default function ModelBuilderChat() {
  const { messages, sendMessage, status, error } = useChat({ transport });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="text-lg font-medium text-charcoal">
              Model Builder
            </div>
            <p className="text-sm text-medium-gray max-w-md mx-auto">
              Describe what kind of prediction model you want to build. For
              example: &quot;Create a model that heavily weights goaltending and
              defensive metrics&quot; or &quot;Make something like v3 but with
              more emphasis on recent form.&quot;
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
                        className="bg-white border border-border-gray rounded-xl rounded-bl-sm px-4 py-2.5 max-w-lg text-sm text-charcoal whitespace-pre-wrap"
                      >
                        {part.text}
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
                      />
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
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the model you want to build..."
          className="flex-1 border border-border-gray rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-charcoal"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-charcoal text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-charcoal/90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

const SUGGESTIONS = [
  "Build a defense-first model",
  "Make a model focused on goaltending",
  "Create something like v3 but with more weight on recent form",
  "Build a model that ignores faceoffs and emphasizes shots",
];
