import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";

type Props = {
  label: string;
} & TextInputProps;

export default function AuthTextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...rest} style={[styles.input, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { width: "100%", marginTop: 10 },
  label: { color: "#444", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
});
