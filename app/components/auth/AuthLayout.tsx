import { ReactNode } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/app/theme/colors";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
};

export default function AuthLayout({ title, subtitle, onBack, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["left", "right"]}>
      {onBack && (
        <View style={[styles.header, { top: insets.top + 6 }]}>
          <Pressable onPress={onBack} style={styles.backLink} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={18} color={colors.qcRed} />
            <Text style={styles.backText}>Back to chat</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.container}>
        <Image source={require("@/assets/images/qc-logo.png")} style={styles.logo} />
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { position: "absolute", left: 16, zIndex: 10 },
  backLink: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 4 },
  backText: { color: colors.qcRed, fontWeight: "700", marginLeft: 2 },

  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  logo: { width: 76, height: 76, resizeMode: "contain", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, marginBottom: 16, textAlign: "center" },
});
