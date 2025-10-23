import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Msg } from "@/app/types/chat";

type Props = { item: Msg };

function MessageBubbleBase({ item }: Props) {
  const isAssistant = item.role === "assistant";
  return (
    <View style={[styles.bubble, isAssistant ? styles.bot : styles.user]}>
      <Text style={styles.msgText}>{item.content}</Text>
    </View>
  );
}

export default memo(MessageBubbleBase);

const styles = StyleSheet.create({
  bubble: {
    padding: 12, borderRadius: 16, marginVertical: 6, maxWidth: "85%",
    alignSelf: "flex-start", backgroundColor: "#f2f2f2", marginHorizontal: 12
  },
  user: { alignSelf: "flex-end", backgroundColor: "#e9eefc" },
  bot: { alignSelf: "flex-start", backgroundColor: "#f2f2f2" },
  msgText: { fontSize: 16 },
});
