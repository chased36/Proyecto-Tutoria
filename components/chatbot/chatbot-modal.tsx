"use client";

import { useRef, useEffect } from "react";
import { X, Send, Bot, User, Loader2 } from "lucide-react";
import { useChat } from "ai/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatbotModalProps {
  subjectId: string;
  subjectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatbotModal({
  subjectId,
  subjectName,
  isOpen,
  onClose,
}: ChatbotModalProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chatbot",
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content: `¡Hola! Soy TutorIA.
¿Tienes alguna duda sobre ${subjectName}?`,
        },
      ],
      body: { subjectId: subjectId },
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen]);

  const getMessageIcon = (role: string) => {
    switch (role) {
      case "assistant":
        return <Bot size={16} className="text-red-600" />;
      case "user":
        return <User size={16} className="text-gray-600" />;
      default:
        return <Bot size={16} className="text-red-600" />;
    }
  };

  const getMessageStyle = (role: string) => {
    switch (role) {
      case "user":
        return "bg-blue-600 text-white rounded-br-none";
      case "assistant":
        return "bg-gray-100 text-gray-800 rounded-bl-none";
      default:
        return "bg-gray-100 text-gray-800 rounded-bl-none";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute bottom-6 right-6 pointer-events-auto">
        <div className="bg-white rounded-lg shadow-xl w-[400px] h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-red-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <div>
                <h3 className="font-semibold">TutorIA</h3>
                <p className="text-xs opacity-90">{subjectName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="hover:bg-red-700 p-1 rounded"
                aria-label="Cerrar asistente"
                title="Cerrar asistente"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          {/* Mensaje de error de conexión */}
          {error && (
            <div className="p-2 bg-red-50 border-b border-red-200 text-red-700 text-xs text-center">
              <span className="inline-block mr-1">⚠️</span> Error de conexión:{" "}
              {error.message || "Error desconocido."}
              <br />
            </div>
          )}
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
                    {getMessageIcon(message.role)}
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-lg shadow-sm",
                    getMessageStyle(message.role)
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    {getMessageIcon(message.role)}
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages.length > 0 && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="animate-spin text-red-600" />
                </div>
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Procesando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Pregunta sobre la asignatura..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Enviar pregunta"
              >
                <Send size={20} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
