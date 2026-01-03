import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Bot, Send, Mic, Volume2, User, Loader, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "/api";

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [answerSource, setAnswerSource] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(heightDiff > 50 ? heightDiff : 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  const handleInputFocus = () => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 300);
  };

  /* -------------------- CHAT -------------------- */

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const payload = {
        question: userMessage.content,
        type: "text",
        ...(answerSource && { answer_source: answerSource }),
      };

      const res = await axios.post(`${API_BASE_URL}/ai-engine/chat`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          tags: res.data.tags,
          timestamp: res.data.timestamp,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          error: true,
          content: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- VOICE INPUT -------------------- */

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        stream.getTracks().forEach((t) => t.stop());
        await processVoice(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      alert("মাইক্রোফোন অনুমতি অস্বীকৃত");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const processVoice = async (audioBlob) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("audio_file", audioBlob);

      const res = await axios.post(
        `${API_BASE_URL}/ai-engine/voice-input`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setInputMessage(res.data.transcribed_text);
    } catch {
      alert("ভয়েস রিকগনিশন ব্যর্থ");
    } finally {
      setLoading(false);
    }
  };

  const playVoice = async (text) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/ai-engine/voice-output`,
        { text, voice: "alloy" },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );

      new Audio(URL.createObjectURL(res.data)).play();
    } catch {
      alert("অডিও চালাতে ব্যর্থ");
    }
  };

  /* -------------------- UI -------------------- */

  return (
    <div 
      className="flex flex-col p-2 sm:p-3 lg:p-4 bg-gray-50 dark:bg-gray-900"
      style={{ height: `calc(100dvh - 64px - ${keyboardHeight}px)` }}
    >
      {/* Compact Header */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
            জিনি AI সহকারী
          </h1>
        </div>
      </div>

      {/* Compact Source Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">উৎস:</span>
          <select
            value={answerSource}
            onChange={(e) => setAnswerSource(e.target.value)}
            className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
          >
            <option value="">সকল উৎস</option>
            <option value="Academic Book">একাডেমিক বই</option>
            <option value="Reference Book">রেফারেন্স বই</option>
          </select>
        </div>
      </div>

      {/* Chat Area - Takes remaining space */}
      <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">চ্যাট</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">GPT-4o Turbo</span>
        </div>

        {/* Messages Container - Scrollable */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 space-y-3"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Bot className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                আপনার একাডেমিক বিষয়ে যেকোনো প্রশ্ন করুন
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-1.5`}
            >
              {m.role === "assistant" && (
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full h-fit shrink-0">
                  <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
              )}

              <div
                className={`rounded-lg px-3 py-2 text-sm max-w-[85%] sm:max-w-[75%]
                ${
                  m.role === "user"
                    ? "bg-emerald-500 text-white"
                    : m.error
                      ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

                {m.role === "assistant" && !m.error && (
                  <button
                    onClick={() => playVoice(m.content)}
                    className="mt-1.5 flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Volume2 className="h-3 w-3" /> শুনুন
                  </button>
                )}
              </div>

              {m.role === "user" && (
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-fit shrink-0">
                  <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-1.5 items-center">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                <Loader className="h-4 w-4 animate-spin text-gray-500" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-2 shrink-0 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <Button
              size="icon"
              variant="outline"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`h-9 w-9 shrink-0 rounded-full border-gray-200 dark:border-gray-600 ${
                isRecording ? "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700" : ""
              }`}
            >
              <Mic
                className={`h-4 w-4 ${isRecording ? "text-red-600 animate-pulse" : "text-gray-500 dark:text-gray-400"}`}
              />
            </Button>

            <input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              onFocus={handleInputFocus}
              placeholder="প্রশ্ন করুন..."
              disabled={loading}
              className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500"
            />

            <Button
              size="icon"
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim()}
              className="h-9 w-9 shrink-0 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
