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
    { id: uid(), role: "assistant", content: STARTER_ASSISTANT_TEXT },
  ]);
  const [input, setInput] = useState("");
  const sending = useRef(false);

  const hasStarted = messages.length > 1; // hide the seed message & show empty state message until first user message

  const send = async () => {
    const text = input.trim();
    if (!text || sending.current) return;

    sending.current = true;
    const userMsg: Msg = { id: uid(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const history = [...messages.slice(-10), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const ok = res.ok;
      const data = ok ? await res.json() : null;
      const reply =
        (data?.reply as string | undefined) ??
        (ok ? "Sorry, I'm not sure." : "Network error—please try again.");

      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: "Network error—please try again." },
      ]);
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
