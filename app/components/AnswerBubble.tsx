import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, Pressable } from "react-native";
import Markdown from "@ronradtke/react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import CitationsCard from "./CitationsCard";
import type { Citation } from "@/app/types/chat";
import { colors } from "@/app/theme/colors";

type Props = {
  content: string;
  sources?: Citation[];
  ts?: number;
};

export default function AnswerBubble({ content, sources, ts }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(content || "");
    } catch {}
  };

  const timeLabel = formatTime(ts ?? Date.now());

  // Animate the whole pressable card so onLongPress works without blocking links
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  return (
    <AnimatedPressable
      onLongPress={handleCopy}
      delayLongPress={220}
      android_disableSound
      style={[styles.card, { opacity, transform: [{ translateY }] }]}
    >
      <Markdown style={md}>{content || ""}</Markdown>

      {!!sources?.length && <CitationsCard sources={sources} />}

      <Text style={styles.timestamp}>{timeLabel}</Text>
    </AnimatedPressable>
  );
}

function formatTime(ms: number) {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "flex-start",
    maxWidth: "90%",
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  timestamp: {
    marginTop: 6,
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#9aa0a6",
  },
});

const md = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22, color: "#222" },
  paragraph: { marginTop: 4, marginBottom: 8 },
  strong: { fontWeight: "700" },
  bullet_list: { marginTop: 2, marginBottom: 8 },
  ordered_list: { marginTop: 2, marginBottom: 8 },
  list_item: { marginBottom: 4 },
  link: { color: colors.qcRed, textDecorationLine: "underline", fontWeight: "600" },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#f4c9c6",
    paddingLeft: 10,
    color: "#444",
  },
  heading1: { fontSize: 20, fontWeight: "700", marginBottom: 8, color: "#111", letterSpacing: 0.2 },
  heading2: { fontSize: 18, fontWeight: "700", marginBottom: 6, color: "#111", letterSpacing: 0.2 },
});
