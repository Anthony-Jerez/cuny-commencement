import * as SQLite from "expo-sqlite";

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: number;
  sources_json?: string | null;
};

export type ConversationRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  created_at: number;
};

const db = SQLite.openDatabaseSync("commencement.db");

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      sources_json TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, created_at);
  `);
}

export function createConversation(id: string, userId: string, title?: string | null) {
  db.runSync(
    "INSERT INTO conversations(id, user_id, title, created_at) VALUES (?, ?, ?, ?)",
    id, userId, title ?? null, Date.now()
  );
}

export function upsertMessage(row: ChatMessageRow) {
  db.runSync(
    "INSERT OR REPLACE INTO messages(id, conversation_id, role, content, created_at, sources_json) VALUES (?, ?, ?, ?, ?, ?)",
    row.id, row.conversation_id, row.role, row.content, row.created_at, row.sources_json ?? null
  );
}

// SCOPED READS
export function listConversationsByUser(userId: string): ConversationRow[] {
  return db.getAllSync<ConversationRow>(
    "SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC",
    userId
  );
}

export function loadConversationMessagesForUser(userId: string, conversationId: string): ChatMessageRow[] {
  return db.getAllSync<ChatMessageRow>(
    `SELECT m.*
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = ? AND c.id = ?
      ORDER BY m.created_at ASC`,
    userId, conversationId
  );
}

// SCOPED WRITES 
export function deleteConversationForUser(userId: string, id: string) {
  db.runSync(
    "DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE id = ? AND user_id = ?)",
    id, userId
  );
  db.runSync("DELETE FROM conversations WHERE id = ? AND user_id = ?", id, userId);
}

export function renameConversationForUser(userId: string, id: string, title: string) {
  db.runSync("UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?", title, id, userId);
}

export function removeOrphanConversations() {
  db.runSync("DELETE FROM conversations WHERE user_id IS NULL");
}
