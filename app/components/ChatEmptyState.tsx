import { View, Text, StyleSheet } from "react-native";

type Props = { title?: string; subtitle?: string; avatarLetter?: string };

export default function HeroEmptyState({
  title = "What can I help with?",
  subtitle = "Ask me about ceremony details, parking, dining, or any other graduation questions.",
  avatarLetter = "Q",
}: Props) {
  return (
    <View style={styles.hero}>
      <View style={styles.avatar}><Text style={styles.avatarLetter}>{avatarLetter}</Text></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#c44536", alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontSize: 36, fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "800", marginTop: 12 },
  subtitle: { textAlign: "center", color: "#666", paddingHorizontal: 12 },
});
