import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, useColorScheme,
  Platform, ActivityIndicator, ScrollView, Alert, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import Colors from "@/constants/colors";
import { useApp, ParsedEvent } from "@/contexts/AppContext";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";

interface ParseResult {
  events: ParsedEvent[];
  clarifications?: string[];
  summary?: string;
}

export default function RantScreen() {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { parseRant, createBatchEvents } = useApp();
  const inputRef = useRef<TextInput>(null);

  const [rantText, setRantText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [streamText, setStreamText] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleParse = async () => {
    if (!rantText.trim() || isParsing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    setIsParsing(true);
    setParseResult(null);
    setStreamText("");
    setSavedMessage("");

    try {
      const fullContent = await parseRant(rantText.trim(), (chunk) => {
        setStreamText((prev) => prev + chunk);
      });

      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ParseResult;
          setParseResult(parsed);
        }
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
      }
    } catch (err) {
      console.error("Parse error:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveEvents = async () => {
    if (!parseResult?.events?.length) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);

    try {
      await createBatchEvents(parseResult.events);
      setSavedMessage(`${parseResult.events.length} event${parseResult.events.length > 1 ? "s" : ""} added to your calendar!`);
      setRantText("");
      setParseResult(null);
      setStreamText("");
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time: string) => {
    try {
      const [h, m] = time.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
    } catch {
      return time;
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Ionicons name="sparkles" size={22} color={theme.tint} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>AI Schedule</Text>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.promptText, { color: theme.textSecondary }]}>
            Rant about your upcoming schedule and I'll organize it into events
          </Text>

          <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <TextInput
              ref={inputRef}
              style={[styles.rantInput, { color: theme.text }]}
              placeholder="e.g. So tomorrow I have a dentist appointment at 2pm, then Wednesday I need to study for my math exam probably like 4 hours, and Friday is Sarah's birthday dinner at 7..."
              placeholderTextColor={theme.textTertiary}
              value={rantText}
              onChangeText={setRantText}
              multiline
              textAlignVertical="top"
              blurOnSubmit={false}
            />
            <View style={styles.inputActions}>
              <Pressable
                style={[styles.parseButton, { backgroundColor: rantText.trim() ? theme.tint : theme.border }]}
                onPress={handleParse}
                disabled={!rantText.trim() || isParsing}
              >
                {isParsing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={rantText.trim() ? "#fff" : theme.textTertiary} />
                    <Text style={[styles.parseButtonText, { color: rantText.trim() ? "#fff" : theme.textTertiary }]}>
                      Parse
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {savedMessage ? (
            <View style={[styles.successCard, { backgroundColor: theme.tint + "15" }]}>
              <Feather name="check-circle" size={18} color={theme.tint} />
              <Text style={[styles.successText, { color: theme.tint }]}>{savedMessage}</Text>
            </View>
          ) : null}

          {parseResult?.events && parseResult.events.length > 0 ? (
            <View style={styles.resultsSection}>
              {parseResult.summary ? (
                <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                  {parseResult.summary}
                </Text>
              ) : null}

              {parseResult.events.map((event, i) => {
                const eventColor = (Colors.event as any)[event.color] || Colors.event.blue;
                return (
                  <View key={i} style={[styles.eventPreview, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <View style={[styles.previewBar, { backgroundColor: eventColor }]} />
                    <View style={styles.previewContent}>
                      <Text style={[styles.previewTitle, { color: theme.text }]}>{event.title}</Text>
                      <View style={styles.previewMeta}>
                        <Text style={[styles.previewDate, { color: theme.textSecondary }]}>
                          {event.date}
                        </Text>
                        <Text style={[styles.previewTime, { color: theme.textSecondary }]}>
                          {formatTime(event.startTime)}
                          {event.endTime ? ` - ${formatTime(event.endTime)}` : ""}
                        </Text>
                      </View>
                      <View style={styles.previewTags}>
                        <View style={[styles.previewTag, { backgroundColor: eventColor + "20" }]}>
                          <Text style={[styles.previewTagText, { color: eventColor }]}>{event.category}</Text>
                        </View>
                        <View style={[styles.previewTag, { backgroundColor: (Colors.priority as any)[event.priority] + "20" }]}>
                          <Text style={[styles.previewTagText, { color: (Colors.priority as any)[event.priority] }]}>{event.priority}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              {parseResult.clarifications && parseResult.clarifications.length > 0 ? (
                <View style={[styles.clarificationCard, { backgroundColor: Colors.light.warning + "15" }]}>
                  <Feather name="help-circle" size={16} color={Colors.light.warning} />
                  <View style={{ flex: 1 }}>
                    {parseResult.clarifications.map((q, i) => (
                      <Text key={i} style={[styles.clarificationText, { color: theme.text }]}>{q}</Text>
                    ))}
                  </View>
                </View>
              ) : null}

              <Pressable
                style={[styles.saveButton, { backgroundColor: theme.tint }]}
                onPress={handleSaveEvents}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      Add {parseResult.events.length} Event{parseResult.events.length > 1 ? "s" : ""}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}

          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
  },
  promptText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  inputCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  rantInput: {
    minHeight: 140,
    maxHeight: 200,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  inputActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 12,
    paddingTop: 0,
    gap: 8,
  },
  parseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  parseButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  successText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  resultsSection: {
    marginTop: 20,
    gap: 10,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 4,
  },
  eventPreview: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewBar: {
    width: 4,
  },
  previewContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  previewTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  previewMeta: {
    flexDirection: "row",
    gap: 12,
  },
  previewDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  previewTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  previewTags: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  previewTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewTagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  clarificationCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    alignItems: "flex-start",
  },
  clarificationText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    marginTop: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
