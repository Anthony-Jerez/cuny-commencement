import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onMenuPress?: () => void;
  onSignInPress?: () => void;
  title?: string;
};

export default function ChatHeader({
  onMenuPress,
  onSignInPress,
  title = "QC Commencement",
}: Props) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.iconBtn} onPress={onMenuPress} accessibilityLabel="Menu">
        <Ionicons name="menu" size={22} />
      </Pressable>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      <Pressable style={styles.signInBtn} onPress={onSignInPress} accessibilityLabel="Sign in">
        <Text style={styles.signInText}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  headerTitle: {
    flex: 1,
    textAlign: "left",
    fontSize: 18,
    fontWeight: "700",
  },
  signInBtn: {
    borderWidth: 1,
    borderColor: "#f2b0ad",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#fff5f4",
    marginLeft: 4,
  },
  signInText: { color: "#c06b6b", fontWeight: "600" },
});
