import { useState } from "react";
import { ActionSheetIOS, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import ChatHeader from "@/app/components/ChatHeader";
import Composer from "@/app/components/Composer";
import MessageList from "@/app/components/MessageList";
import TextFooter from "@/app/components/TextFooter";
import PastChatsDrawer from "@/app/components/menu/PastChatsDrawer";
import { useChat } from "@/app/hooks/useChat";
import type { ConversationRow } from "@/app/storage/db";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

export default function ChatScreen() {
  const { isSignedIn, userId } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState("");

  const {
    conversationId, messages, convos, hasStarted,
    loadConv, startNewChat, send, deleteConvo,
  } = useChat({ apiBase: API_BASE, isSignedIn, userId });

  const confirmDelete = (c: ConversationRow) => {
    Alert.alert("Delete chat?", "This will permanently remove the chat history.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteConvo(c.id) },
    ]);
  };

  const openConvoMenu = (c: ConversationRow) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Delete"], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) confirmDelete(c); }
      );
    } else {
      Alert.alert(c.title || "Conversation", undefined, [
        { text: "Delete", style: "destructive", onPress: () => confirmDelete(c) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ChatHeader onMenuPress={() => isSignedIn && setDrawerOpen(true)} menuEnabled={isSignedIn} />

        <MessageList messages={messages} showHero={!hasStarted} />

        <Composer
          value={input}
          onChangeText={setInput}
          onSend={() => { if (input.trim()) { send(input); setInput(""); } }}
        />

        {!isSignedIn && <TextFooter />}

        <PastChatsDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          conversations={convos}
          onNewChat={startNewChat}
          onSelectChat={loadConv}
          onOptions={openConvoMenu}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
