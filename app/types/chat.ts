export type Citation = { url: string; title?: string; snippet?: string };

export type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  sources?: Citation[];
  createdAt?: number;
};

export const STARTER_ASSISTANT_TEXT =
  "What can I help you with?\nAsk me about ceremony details, parking, tickets, or anything graduation-related.";

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

