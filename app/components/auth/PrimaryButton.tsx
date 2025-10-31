import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "@/app/theme/colors";

type Props = { title: string; onPress: () => void; disabled?: boolean; style?: ViewStyle };

export default function PrimaryButton({ title, onPress, disabled, style }: Props) {
  return (
    <Pressable style={[styles.btn, disabled && { opacity: 0.7 }, style]} onPress={onPress} disabled={disabled}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: 16, backgroundColor: colors.qcRed, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, width: "100%" },
  text: { color: "#fff", textAlign: "center", fontWeight: "700" },
});
