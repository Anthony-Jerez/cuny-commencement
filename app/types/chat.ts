export type Msg = { id: string; role: "user" | "assistant"; content: string };

export const STARTER_ASSISTANT_TEXT =
  "What can I help with?\nAsk me about ceremony details, parking, tickets, dining, or anything graduation-related.";

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
