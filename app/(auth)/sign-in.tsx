import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSignIn, useSSO } from "@clerk/clerk-expo";
import { makeRedirectUri } from "expo-auth-session";
import AuthLayout from "@/app/components/auth/AuthLayout";
import AuthTextField from "@/app/components/auth/AuthTextField";
import PrimaryButton from "@/app/components/auth/PrimaryButton";
import OutlineButton from "@/app/components/auth/OutlineButton";
import OrDivider from "@/app/components/auth/OrDivider";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const redirectUrl = makeRedirectUri({ scheme: "cunycommencement" });

  const onEmailPassword = async () => {
    if (!isLoaded) return;
    try {
      const res = await signIn.create({ identifier: emailAddress, password });
      if (res.status === "complete") {
        await setActive!({ session: res.createdSessionId });
        router.replace("/");
      } else {
        router.push("/(auth)/verify-email");
        alert("Additional verification required.");
      }
    } catch (e: any) {
      alert(e?.errors?.[0]?.message ?? "Sign in failed");
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
      alert("Google sign-in failed");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthLayout title="Welcome back" subtitle="Sign in to continue" onBack={() => router.replace("/")}>
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
          placeholder="Enter password"
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton title="Sign in" onPress={onEmailPassword} />

        <OrDivider />

        <OutlineButton title="Continue with Google" onPress={onGoogle} />

        <OutlineButton
          title="New here? Create an account"
          onPress={() => router.push("/(auth)/sign-up")}
          style={{ backgroundColor: "#fff", marginTop: 12 }}
        />
      </AuthLayout>
    </KeyboardAvoidingView>
  );
}

