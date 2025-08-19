"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Bot,
  User,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { PDF } from "@/lib/db";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface ChatbotModalProps {
  subjectId: string;
  subjectName: string;
  pdfs: PDF[];
  onClose: () => void;
}

export function ChatbotModal({
  subjectId,
  subjectName,
  pdfs,
  onClose,
}: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `¡Hola! Soy tu asistente de IA para la asignatura "${subjectName}".\n\n¿En qué puedo ayudarte?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input.trim(),
          subjectId,
          pdfs: pdfs.map((pdf) => ({
            id: pdf.id,
            filename: pdf.filename,
            url: pdf.url,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Lo siento, no pude procesar tu pregunta.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      let errorContent = "Lo siento, hubo un error al procesar tu pregunta.";

      if (error instanceof Error) {
        if (error.message.includes("conexión")) {
          errorContent =
            "Error de conexión. Verifica tu conexión a internet e intenta de nuevo.";
        } else if (error.message.includes("autenticación")) {
          errorContent =
            "Error de autenticación con el servicio de IA. Contacta al administrador.";
        } else if (error.message.includes("configuración")) {
          errorContent =
            "Error de configuración del servidor. Contacta al administrador.";
        }
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-end justify-end p-6 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <div>
              <h3 className="font-semibold">Asistente IA</h3>
              <p className="text-xs opacity-90">{subjectName}</p>
              <p className="text-xs opacity-75">Powered by Groq</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-1 rounded"
            title="Cerrar chatbot"
          >
            <X size={20} />
          </button>
        </div>

        {/* PDFs disponibles */}
        {pdfs.length > 0 && (
          <div className="p-3 bg-gray-50 border-b">
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {pdfs.map((pdf) => (
                <span
                  key={pdf.id}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
                  title={pdf.filename}
                >
                  <FileText size={12} />
                  {pdf.filename.length > 20
                    ? `${pdf.filename.substring(0, 20)}...`
                    : pdf.filename}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.error ? "bg-red-100" : "bg-blue-100"
                  }`}
                >
                  {message.error ? (
                    <AlertCircle size={16} className="text-red-600" />
                  ) : (
                    <Bot size={16} className="text-blue-600" />
                  )}
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : message.error
                    ? "bg-red-50 text-red-800 border border-red-200 rounded-bl-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-gray-600" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-blue-600" />
              </div>
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Groq está pensando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre la materia..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Enviar pregunta"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Máximo 500 caracteres • Powered by Groq
          </p>
        </form>
      </div>
    </div>
  );
}
