import { useEffect, useRef, useState } from "react";
import { STARTER_ASSISTANT_TEXT, type Msg, uid as newId } from "@/app/types/chat";
import {
  initDb,
  createConversation,
  upsertMessage,
  listConversationsByUser,
  loadConversationMessagesForUser,
  deleteConversationForUser,
  renameConversationForUser,
  removeOrphanConversations,
  type ConversationRow,
  type ChatMessageRow,
} from "@/app/storage/db";

type Opts = {
  apiBase?: string;
  isSignedIn?: boolean;
  userId?: string | null | undefined;
};

export function useChat({ apiBase, isSignedIn, userId }: Opts) {
  const signedIn = !!isSignedIn;
  const authUid = userId ?? null;
  const base = apiBase ?? process.env.EXPO_PUBLIC_API_BASE ?? "";

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { id: newId(), role: "assistant", content: STARTER_ASSISTANT_TEXT, createdAt: Date.now() },
  ]);
  const [convos, setConvos] = useState<ConversationRow[]>([]);
  const sending = useRef(false);

  const hasStarted = messages.length > 1;

  const rowsToMsgs = (rows: ChatMessageRow[]) =>
    rows.map<Msg>((r) => ({
      id: r.id,
      role: r.role as Msg["role"],
      content: r.content,
      createdAt: r.created_at,
      sources: r.sources_json ? (() => { try { return JSON.parse(r.sources_json); } catch { return []; } })() : [],
    }));

  const refreshConvos = () => {
    if (!authUid) return;
    setConvos(listConversationsByUser(authUid));
  };

  const loadConv = (id: string) => {
    if (!authUid) return;
    const rows = loadConversationMessagesForUser(authUid, id);
    if (!rows.length) {
      const starter: Msg = { id: newId(), role: "assistant", content: STARTER_ASSISTANT_TEXT, createdAt: Date.now() };
      setConversationId(id);
      setMessages([starter]);
      persist(starter, id);
    } else {
      setConversationId(id);
      setMessages(rowsToMsgs(rows));
    }
  };

  const startNewChat = () => {
    if (!signedIn || !authUid) return;
    const id = newId();
    createConversation(id, authUid, "Commencement Q&A");
    const starter: Msg = { id: newId(), role: "assistant", content: STARTER_ASSISTANT_TEXT, createdAt: Date.now() };
    setConversationId(id);
    setMessages([starter]);
    persist(starter, id);
    refreshConvos();
  };

  const persist = (m: Msg, convId: string) => {
    if (!signedIn || !authUid) return;
    upsertMessage({
      id: m.id,
      conversation_id: convId,
      role: m.role,
      content: m.content,
      created_at: m.createdAt ?? Date.now(),
      sources_json: m.sources ? JSON.stringify(m.sources) : null,
    });
  };

  const autoTitleFromFirstMessage = (text: string, fallbackIndex: number) => {
    const cleaned = (text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) return `QC Commencement Chat #${fallbackIndex}`;
    const short = cleaned.split(" ").slice(0, 6).join(" ");
    return short.charAt(0).toUpperCase() + short.slice(1);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending.current) return;
    sending.current = true;

    const userMsg: Msg = { id: newId(), role: "user", content: trimmed, createdAt: Date.now() };
    const pendingId = newId();
    const pending: Msg = { id: pendingId, role: "assistant", content: "", loading: true };
    const currentConv = conversationId;

    // Rename chat based on first prompt
    if (signedIn && authUid && currentConv && messages.length <= 1) {
      const newTitle = autoTitleFromFirstMessage(trimmed, convos.length + 1);
      try { renameConversationForUser(authUid, currentConv, newTitle); } catch {}
      refreshConvos();
    }

    setMessages((prev) => [...prev, userMsg, pending]);
    if (currentConv) persist(userMsg, currentConv);

    try {
      const history = [...messages.filter((m) => !m.loading).slice(-10), userMsg].map((m) => ({
        role: m.role, content: m.content,
      }));

      const res = await fetch(`${base}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, top_k: 6 }),
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

      const finalMsg: Msg = {
        id: pendingId,
        role: "assistant",
        content: reply,
        loading: false,
        sources,
        createdAt: Date.now(),
      };

      setMessages((prev) => prev.map((m) => (m.id === pendingId ? finalMsg : m)));
      if (currentConv) persist(finalMsg, currentConv);
    } catch {
      const errMsg: Msg = {
        id: pendingId,
        role: "assistant",
        content: "Network error—please try again.",
        loading: false,
        createdAt: Date.now(),
      };
      setMessages((prev) => prev.map((m) => (m.id === pendingId ? errMsg : m)));
      if (currentConv) persist(errMsg, currentConv);
    } finally {
      sending.current = false;
    }
  };

  const deleteConvo = (id: string) => {
    if (!authUid) return;
    deleteConversationForUser(authUid, id);
    const remaining = listConversationsByUser(authUid);
    setConvos(remaining);
    if (conversationId === id) {
      if (remaining.length) loadConv(remaining[0].id);
      else startNewChat();
    }
  };

  useEffect(() => {
    if (!signedIn || !authUid) {
      setConversationId(null);
      setConvos([]);
      setMessages([{ id: newId(), role: "assistant", content: STARTER_ASSISTANT_TEXT, createdAt: Date.now() }]);
      return;
    }
    initDb();
    try { removeOrphanConversations(); } catch {}
    const all = listConversationsByUser(authUid);
    setConvos(all);
    if (all.length) loadConv(all[0].id);
    else startNewChat();
  }, [signedIn, authUid]);

  return {
    conversationId,
    messages,
    convos,
    hasStarted,
    refreshConvos,
    loadConv,
    startNewChat,
    send,
    deleteConvo,
  };
}
