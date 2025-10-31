import { useCallback } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/app/theme/colors";

type Props = { 
  value: string; 
  onChangeText: (t: string) => void; 
  onSend: () => void; 
  placeholder?: string 
};

export default function Composer({ value, onChangeText, onSend, placeholder = "Ask about commencement details…" }: Props) {
  const handleSubmit = useCallback(() => onSend(), [onSend]);
  return (
    <View style={styles.inputRow}>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
      />
      <Pressable onPress={handleSubmit} style={styles.sendBtn}>
        <Ionicons name="send" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border
  },
  input: {
    flex: 1, backgroundColor: colors.cardBg, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ddd",
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20
  },
  sendBtn: {
    height: 40, width: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.qcPink, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.qcPinkBorder
  },
});
