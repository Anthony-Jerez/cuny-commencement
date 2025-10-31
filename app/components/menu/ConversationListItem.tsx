import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/app/theme/colors";
import type { ConversationRow } from "@/app/storage/db";

type Props = {
  item: ConversationRow;
  onPress: (id: string) => void;
  onOptions: (c: ConversationRow) => void;
};

export default function ConversationListItem({ item, onPress, onOptions }: Props) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.press} onPress={() => onPress(item.id)}>
        <Text style={styles.title} numberOfLines={1}>{item.title || "Conversation"}</Text>
        <Text style={styles.meta}>
          {new Date(item.created_at).toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}
        </Text>
      </Pressable>
      <Pressable onPress={() => onOptions(item)} hitSlop={8} style={styles.ellipsis} accessibilityLabel="Chat options">
        <Ionicons name="ellipsis-horizontal" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  press: { flex: 1, paddingRight: 8 },
  ellipsis: { padding: 6, borderRadius: 12 },
  title: { fontWeight: "700", color: colors.text, marginBottom: 2 },
  meta: { color: colors.muted, fontSize: 12 },
});
