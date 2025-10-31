import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSignUp, useSignIn } from "@clerk/clerk-expo";
import { colors } from "@/app/theme/colors";

export default function VerifyEmailScreen() {
  const router = useRouter();

  const { isLoaded: suLoaded, signUp, setActive: setActiveFromSignUp } = useSignUp();
  const { isLoaded: siLoaded, signIn, setActive: setActiveFromSignIn } = useSignIn();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // Try to show the target email if Clerk exposes it
  const targetEmail = useMemo(() => {
    // @ts-ignore
    const suEmail = (signUp as any)?.emailAddress ?? (signUp as any)?.preparation?.emailAddress;
    // @ts-ignore
    const siEmail = (signIn as any)?.identifier;
    return (suEmail || siEmail || "").toString();
  }, [suLoaded, siLoaded, signUp, signIn]);

  useEffect(() => {
    // If user came here by accident and nothing needs verification, direct to sign-in
    if (!suLoaded && !siLoaded) return;
    // @ts-ignore
    const suNeeds = (signUp as any)?.verifications?.emailAddress?.status === "needs_verification";
    // @ts-ignore
    const siNeeds = (signIn as any)?.firstFactorVerification?.status === "needs_first_factor";
    if (!suNeeds && !siNeeds) {
      // router.replace("/(auth)/sign-in");
    }
  }, [suLoaded, siLoaded, signUp, signIn, router]);

  const onVerify = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      // Complete sign-up email verification
      if (suLoaded && signUp) {
        // @ts-ignore
        const res = await signUp.attemptEmailAddressVerification({ code });
        if (res.status === "complete") {
          // After sign-up completes, Clerk gives us a session id
          await setActiveFromSignUp!({ session: res.createdSessionId });
          router.replace("/");
          return;
        }
      }

      if (siLoaded && signIn) {
        // @ts-ignore
        if (signIn.firstFactorVerification?.status === "needs_first_factor") {
          // @ts-ignore
          const res = await signIn.attemptFirstFactor({ strategy: "email_code", code });
          if (res.status === "complete") {
            await setActiveFromSignIn!({ session: res.createdSessionId });
            router.replace("/");
            return;
          }
        }
      }

      Alert.alert("Verification failed", "Please double-check the code and try again.");
    } catch (e: any) {
      Alert.alert("Verification error", e?.errors?.[0]?.message ?? "Could not verify the code.");
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      // Resend for sign-up flow
      if (suLoaded && signUp) {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        Alert.alert("Code sent", "We sent a new code to your email.");
        setResending(false);
        return;
      }
      Alert.alert("Unavailable", "Unable to resend a code for this flow.");
    } catch (e: any) {
      Alert.alert("Resend failed", e?.errors?.[0]?.message ?? "Could not resend the code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <Image source={require("@/assets/images/qc-logo.png")} style={styles.logo} />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code we sent{targetEmail ? ` to ${targetEmail}` : ""}.
        </Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          placeholder="123456"
          maxLength={6}
          style={styles.codeInput}
        />

        <Pressable style={[styles.primaryBtn, submitting && { opacity: 0.7 }]} onPress={onVerify} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify</Text>}
        </Pressable>

        <View style={{ height: 12 }} />

        <Pressable style={styles.secondaryBtn} onPress={onResend} disabled={resending}>
          <Text style={styles.secondaryText}>{resending ? "Sending…" : "Resend code"}</Text>
        </Pressable>

        <View style={{ height: 12 }} />
        <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
          <Text style={{ color: colors.qcRed, fontWeight: "600" }}>Use a different account</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  logo: { width: 76, height: 76, resizeMode: "contain", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 16, textAlign: "center" },
  codeInput: {
    width: "100%",
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  primaryBtn: { marginTop: 16, backgroundColor: colors.qcRed, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, width: "100%" },
  primaryText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  secondaryBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, width: "100%", backgroundColor: colors.qcPink, borderWidth: 1, borderColor: colors.qcPinkBorder },
  secondaryText: { color: colors.qcRed, textAlign: "center", fontWeight: "700" },
});
