import { useEffect, useRef } from "react";
import { FlatList, View, StyleSheet } from "react-native";
import type { Msg } from "@/app/types/chat";
import MessageBubble from "./MessageBubble";
import HeroEmptyState from "@/app/components/ChatEmptyState";

type Props = {
  messages: Msg[];
  showHero: boolean;
};

export default function MessageList({ messages, showHero }: Props) {
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const data = showHero ? [] : messages;

  return (
    <FlatList
      ref={listRef}
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.content,
        { justifyContent: showHero ? "center" : "flex-start" },
      ]}
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => <MessageBubble item={item} />}
      ListHeaderComponent={showHero ? <HeroEmptyState /> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 24 },
});
