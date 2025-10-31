import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSignUp, useSSO } from "@clerk/clerk-expo";
import { makeRedirectUri } from "expo-auth-session";
import AuthLayout from "@/app/components/auth/AuthLayout";
import AuthTextField from "@/app/components/auth/AuthTextField";
import PrimaryButton from "@/app/components/auth/PrimaryButton";
import OutlineButton from "@/app/components/auth/OutlineButton";
import OrDivider from "@/app/components/auth/OrDivider";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const redirectUrl = makeRedirectUri({ scheme: "cunycommencement" });

  const onEmailPassword = async () => {
    if (!isLoaded) return;
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      alert("We sent you a code. Enter it on the next screen.");
      router.push("/(auth)/verify-email");
    } catch (e: any) {
      alert(e?.errors?.[0]?.message ?? "Sign up failed");
    }
  };

  const onGoogle = async () => {
    try {
      const { createdSessionId, setActive: setActiveFromSSO } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });
      if (createdSessionId) {
        await setActiveFromSSO!({ session: createdSessionId });
        router.replace("/");
      }
    } catch {
      alert("Google sign-up failed");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthLayout title="Create your account" onBack={() => router.replace("/")}>
        <AuthTextField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@qc.cuny.edu"
          value={emailAddress}
          onChangeText={setEmail}
        />
        <AuthTextField
          label="Password"
          secureTextEntry
          placeholder="At least 8 characters"
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton title="Create account" onPress={onEmailPassword} />

        <OrDivider />

        <OutlineButton title="Sign up with Google" onPress={onGoogle} />
        <OutlineButton
          title="Already have an account? Sign in"
          onPress={() => router.push("/(auth)/sign-in")}
          style={{ backgroundColor: "#fff", marginTop: 12 }}
        />
      </AuthLayout>
    </KeyboardAvoidingView>
  );
}
