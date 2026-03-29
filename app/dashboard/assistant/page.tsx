"use client";

import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
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
    <Stack spacing={3} sx={{ maxWidth: 960, mx: "auto" }}>
      <Box>
        <Typography variant="h4">AI Assistant</Typography>
        <Typography color="text.secondary">
          Ask anything about your business
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {SAMPLE_QUESTIONS.map((q) => (
          <Chip
            key={q}
            label={q}
            variant="outlined"
            onClick={() => sendMessage(q)}
            clickable
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          minHeight: 420,
          maxHeight: 560,
          overflowY: "auto",
          p: 2,
          borderRadius: 3,
        }}
      >
        <Stack spacing={2}>
        {messages.map((msg, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
                <SmartToyIcon sx={{ fontSize: 18 }} />
              </Avatar>
            )}
            <Paper
              elevation={0}
              sx={{
                maxWidth: "80%",
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: msg.role === "user" ? "primary.main" : "background.default",
                color: msg.role === "user" ? "primary.contrastText" : "text.primary",
              }}
            >
              <Box sx={{ fontSize: 14, lineHeight: 1.6 }}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p style={{ marginTop: 0, marginBottom: 8 }}>{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ marginTop: 0, marginBottom: 8, paddingLeft: 18 }}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ marginTop: 0, marginBottom: 8, paddingLeft: 18 }}>
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: 4 }}>{children}</li>
                      ),
                      code: ({ children }) => (
                        <code
                          style={{
                            backgroundColor: "rgba(15,23,42,0.08)",
                            borderRadius: 6,
                            padding: "1px 6px",
                            fontSize: 12,
                            wordBreak: "break-word",
                          }}
                        >
                          {children}
                        </code>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          style={{ textDecoration: "underline" }}
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
              </Box>
            </Paper>
          </Box>
        ))}
        {loading && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Thinking...
            </Typography>
          </Stack>
        )}
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about your business..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <Button
          variant="contained"
          onClick={() => void sendMessage()}
          disabled={loading}
          endIcon={<SendIcon />}
        >
          Send
        </Button>
      </Stack>
    </Stack>
  );
}