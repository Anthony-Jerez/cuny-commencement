import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

export default function TypingBubble() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={{ color: "#666" }}>Thinking…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "flex-start",
    maxWidth: "90%",
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
  },
});
