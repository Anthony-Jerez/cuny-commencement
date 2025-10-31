import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

export default function TextFooter() {
  return (
    <View style={{ alignItems: "center", paddingBottom: 8 }}>
      <Pressable onPress={() => router.push("/(auth)/sign-in")}>
        <Text style={{ color: "#c06b6b", fontWeight: "600" }}>Sign in to save chats</Text>
      </Pressable>
    </View>
  );
}
