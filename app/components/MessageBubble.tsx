import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Msg } from "@/app/types/chat";
import TypingBubble from "./TypingBubble";
import AnswerBubble from "./AnswerBubble";

type Props = { item: Msg };

function MessageBubbleBase({ item }: Props) {
  const isAssistant = item.role === "assistant";

  if (isAssistant && item.loading) return <TypingBubble />;

  if (isAssistant) {
    return <AnswerBubble content={item.content} sources={item.sources} ts={item.createdAt} />;
  }

  return (
    <View style={styles.userPill}>
      <Text style={styles.userText}>{item.content}</Text>
    </View>
  );
}

export default memo(MessageBubbleBase);

const styles = StyleSheet.create({
  userPill: {
    alignSelf: "center",
    maxWidth: "90%",
    marginVertical: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: "#d9534f",
    marginHorizontal: 12,
  },
  userText: { color: "#fff", fontWeight: "600", fontSize: 16, lineHeight: 20 },
});
