import { View, Text, Linking, Pressable, StyleSheet } from "react-native";
import type { Citation } from "@/app/types/chat";
import { colors } from "@/app/theme/colors";

type Props = { sources: Citation[] };

export default function CitationsCard({ sources }: Props) {
  if (!sources?.length) return null;

  return (
    <View style={styles.card}>
      {sources.map((s, i) => (
        <View key={`${s.url}-${i}`} style={[styles.item, i < sources.length - 1 && styles.divider]}>
          <Text style={styles.label}>
            <Text style={styles.bold}>Source:</Text> {s.title ?? "View source"}
          </Text>
          <Pressable onPress={() => Linking.openURL(s.url)}>
            <Text style={styles.link}>View full source</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#fff7f6",
    borderWidth: 1,
    borderColor: "#f4c9c6",
    padding: 10,
  },
  item: {
    paddingVertical: 6,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0dedd",
  },
  label: { color: "#444", marginBottom: 2 },
  bold: { fontWeight: "700" },
  link: { color: colors.qcRed, textDecorationLine: "underline", fontWeight: "600" },
});
