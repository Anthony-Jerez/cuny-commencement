import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { colors } from "@/app/theme/colors";

type Props = { onMenuPress?: () => void; title?: string; menuEnabled?: boolean };

export default function ChatHeader({ onMenuPress, title = "QC Commencement", menuEnabled = true }: Props) {
  const { isSignedIn, signOut } = useAuth();

  return (
    <View style={styles.header}>
      <Pressable
        style={[styles.iconBtn, !menuEnabled && { opacity: 0.4 }]}
        disabled={!menuEnabled}
        onPress={onMenuPress}
        accessibilityLabel="Menu"
      >
        <Ionicons name="menu" size={22} />
      </Pressable>

      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

      {isSignedIn ? (
        <Pressable style={styles.signInBtn} onPress={() => signOut()} accessibilityLabel="Sign out">
          <Text style={styles.signInText}>Sign out</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.signInBtn} onPress={() => router.push("/(auth)/sign-in")} accessibilityLabel="Sign in">
          <Text style={styles.signInText}>Sign in</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 10 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  headerTitle: { flex: 1, textAlign: "left", fontSize: 18, fontWeight: "700" },
  signInBtn: {
    borderWidth: 1, borderColor: colors.qcPinkBorder, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, backgroundColor: colors.qcBlushBg, marginLeft: 4,
  },
  signInText: { color: "#c06b6b", fontWeight: "600" },
});
