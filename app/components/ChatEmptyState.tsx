import { View, Text, StyleSheet, Image } from "react-native";

type Props = { title?: string; subtitle?: string };

export default function HeroEmptyState({
  title = "What can I help you with?",
  subtitle = "Ask me about ceremony details, parking, or any other graduation questions.",
}: Props) {
  return (
    <View style={styles.hero}>
      <Image
        source={require("../../assets/images/qc-logo.png")}
        style={styles.logo}
        accessibilityLabel="Queens College"
        accessibilityIgnoresInvertColors
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 12 },
  logo: {
    width: 200,
    height: 100,
    resizeMode: "contain",
  },
  title: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  subtitle: { textAlign: "center", color: "#666", paddingHorizontal: 12 },
});
