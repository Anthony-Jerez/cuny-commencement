import { useRef, useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChatHeader from "@/app/components/ChatHeader";
import Composer from "@/app/components/Composer";
import MessageList from "@/app/components/MessageList";
import { STARTER_ASSISTANT_TEXT, type Msg, uid } from "@/app/types/chat";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

export default function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: uid(), role: "assistant", content: STARTER_ASSISTANT_TEXT, createdAt: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const sending = useRef(false);

  const hasStarted = messages.length > 1;

  const send = async () => {
    const text = input.trim();
    if (!text || sending.current) return;

    sending.current = true;

    const userMsg: Msg = { id: uid(), role: "user", content: text, createdAt: Date.now() };
    const pendingId = uid();
    const pending: Msg = { id: pendingId, role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, pending]);
    setInput("");

    try {
      // Build brief history (exclude starter + pending)
      const history = [...messages.filter(m => !m.loading).slice(-10), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          top_k: 6,
          // collection: "qc_commencement_llama_v1", // uncomment if you want to target that collection
        }),
      });

      let reply = "Sorry, I'm not sure.";
      let sources: Msg["sources"] = [];
      if (res.ok) {
        const data = await res.json();
        reply = data?.reply ?? reply;
        sources = data?.sources ?? [];
      } else {
        reply = "Network error—please try again.";
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId ? { ...m, loading: false, content: reply, sources, createdAt: Date.now() } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, loading: false, content: "Network error—please try again.", createdAt: Date.now() }
            : m
        )
      );
    } finally {
      sending.current = false;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top','left','right','bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ChatHeader onMenuPress={() => {}} onSignInPress={() => {}} />

        <MessageList messages={messages} showHero={!hasStarted} />

        <Composer value={input} onChangeText={setInput} onSend={send} />

        <View style={{ alignItems: "center", paddingBottom: 8 }}>
          <Text style={{ color: "#c06b6b" }}>Sign in for unlimited messages</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
