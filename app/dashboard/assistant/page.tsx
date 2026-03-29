"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Send, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SAMPLE_QUESTIONS = [
  "Why is my profit low?",
  "Which products need restocking?",
  "How much did I spend this month?",
  "How many unpaid invoices do I have?",
];

export default function AssistantPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI business assistant. Ask me anything about your business — revenue, expenses, inventory, invoices and more!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(question?: string) {
    const q = question || input;
    if (!q.trim()) return;

    const userMessage: Message = { role: "user", content: q };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, userId: user?.id }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again!",
        },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Assistant</h2>
        <p className="text-muted-foreground">
          Ask anything about your business
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SAMPLE_QUESTIONS.map((q) => (
          <Button
            key={q}
            variant="outline"
            className="text-left h-auto py-2 px-3 text-sm"
            onClick={() => sendMessage(q)}
          >
            {q}
          </Button>
        ))}
      </div>

      <div className="space-y-4 min-h-96 max-h-[500px] overflow-y-auto border rounded-lg p-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <Card
              className={`max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : ""}`}
            >
              <CardContent className="p-3 text-sm">
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 mb-2 last:mb-0">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 mb-2 last:mb-0">{children}</ol>
                      ),
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      code: ({ children }) => (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs break-words">
                          {children}
                        </code>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </CardContent>
            </Card>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <Card>
              <CardContent className="p-3 text-sm text-muted-foreground">
                Thinking...
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ask about your business..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={() => sendMessage()} disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}