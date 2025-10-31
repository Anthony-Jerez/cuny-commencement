import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "@/app/theme/colors";

type Props = { title: string; onPress: () => void; style?: ViewStyle };

export default function OutlineButton({ title, onPress, style }: Props) {
  return (
    <Pressable style={[styles.btn, style]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    width: "100%",
    backgroundColor: colors.qcPink,
    borderWidth: 1,
    borderColor: colors.qcPinkBorder,
  },
  text: { color: colors.qcRed, textAlign: "center", fontWeight: "700" },
});
