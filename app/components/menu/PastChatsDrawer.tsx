import { Modal, Pressable, View, Text, StyleSheet, FlatList, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/app/theme/colors";
import ConversationListItem from "./ConversationListItem";
import type { ConversationRow } from "@/app/storage/db";

const DRAWER_W = Math.min(320, Math.round(Dimensions.get("window").width * 0.78));

type Props = {
  visible: boolean;
  onClose: () => void;
  conversations: ConversationRow[];
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onOptions: (c: ConversationRow) => void;
};

export default function PastChatsDrawer({
  visible, onClose, conversations, onNewChat, onSelectChat, onOptions,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.drawer, { width: DRAWER_W, paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Past chats</Text>

        <Pressable onPress={() => { onNewChat(); onClose(); }} style={styles.newBtn}>
          <Text style={styles.newText}>+ New chat</Text>
        </Pressable>

        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <ConversationListItem
              item={item}
              onPress={(id) => { onSelectChat(id); onClose(); }}
              onOptions={onOptions}
            />
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", inset: 0 as any, backgroundColor: "rgba(0,0,0,0.28)" },
  drawer: {
    position: "absolute", top: 0, bottom: 0, left: 0, backgroundColor: "#fff",
    paddingHorizontal: 16, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  newBtn: {
    backgroundColor: colors.qcPink, borderColor: colors.qcPinkBorder, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 12,
  },
  newText: { color: colors.qcRed, fontWeight: "700" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#eee" },
});
