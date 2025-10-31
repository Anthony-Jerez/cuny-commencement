import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/app/theme/colors";

export default function OrDivider() {
  return (
    <View style={styles.wrap}>
      <View style={styles.line} />
      <Text style={{ color: colors.muted }}>or</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16, width: "100%", justifyContent: "center" },
  line: { height: 1, backgroundColor: "#eee", width: 60 },
});
