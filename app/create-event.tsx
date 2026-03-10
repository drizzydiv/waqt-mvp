import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import Colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

const CATEGORIES = ["general", "work", "school", "personal", "health", "social", "errands", "meeting"] as const;
const EVENT_COLORS = ["blue", "green", "red", "orange", "purple", "pink", "teal", "indigo", "yellow", "gray"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return [`${h}:00`, `${h}:30`];
}).flat();

export default function CreateEventScreen() {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { createEvent, selectedDate } = useApp();
  const params = useLocalSearchParams<{ date?: string }>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(params.date || selectedDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState<string>("general");
  const [color, setColor] = useState<string>("blue");
  const [priority, setPriority] = useState<string>("medium");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid Date", "Please enter date as YYYY-MM-DD");
      return;
    }
    if (endTime <= startTime) {
      Alert.alert("Invalid Time", "End time must be after start time");
      return;
    }
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime,
        endTime,
        category,
        color,
        priority,
      });
      router.back();
    } catch (err) {
      setIsSaving(false);
      Alert.alert("Error", "Failed to create event. Please try again.");
    }
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={24} color={theme.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>New Event</Text>
        <Pressable
          onPress={handleSave}
          disabled={!title.trim() || isSaving}
          hitSlop={8}
        >
          <Feather
            name="check"
            size={24}
            color={title.trim() && !isSaving ? theme.tint : theme.textTertiary}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.inputGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TextInput
            style={[styles.titleInput, { color: theme.text }]}
            placeholder="Event title"
            placeholderTextColor={theme.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <TextInput
            style={[styles.descInput, { color: theme.text }]}
            placeholder="Notes (optional)"
            placeholderTextColor={theme.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={[styles.inputGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.fieldRow}>
            <Feather name="calendar" size={18} color={theme.textSecondary} />
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Date</Text>
            <TextInput
              style={[styles.fieldValue, { color: theme.tint }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textTertiary}
            />
          </View>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <View style={styles.fieldRow}>
            <Feather name="clock" size={18} color={theme.textSecondary} />
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Start</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
              {HOURS.map((t) => (
                <Pressable
                  key={`start-${t}`}
                  onPress={() => setStartTime(t)}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: startTime === t ? theme.tint + "20" : "transparent",
                      borderColor: startTime === t ? theme.tint : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      { color: startTime === t ? theme.tint : theme.textSecondary },
                    ]}
                  >
                    {formatTime(t)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <View style={styles.fieldRow}>
            <Feather name="clock" size={18} color={theme.textSecondary} />
            <Text style={[styles.fieldLabel, { color: theme.text }]}>End</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
              {HOURS.map((t) => (
                <Pressable
                  key={`end-${t}`}
                  onPress={() => setEndTime(t)}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: endTime === t ? theme.tint + "20" : "transparent",
                      borderColor: endTime === t ? theme.tint : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      { color: endTime === t ? theme.tint : theme.textSecondary },
                    ]}
                  >
                    {formatTime(t)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CATEGORY</Text>
        <View style={[styles.inputGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.chipGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: category === cat ? theme.tint + "20" : theme.backgroundSecondary,
                    borderColor: category === cat ? theme.tint : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: category === cat ? theme.tint : theme.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>COLOR</Text>
        <View style={[styles.inputGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.colorGrid}>
            {EVENT_COLORS.map((c) => {
              const eventColor = (Colors.event as any)[c];
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorCircle,
                    {
                      backgroundColor: eventColor,
                      borderWidth: color === c ? 3 : 0,
                      borderColor: theme.text,
                    },
                  ]}
                >
                  {color === c ? <Feather name="check" size={14} color="#fff" /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PRIORITY</Text>
        <View style={[styles.inputGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const pColor = (Colors.priority as any)[p];
              return (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityOption,
                    {
                      backgroundColor: priority === p ? pColor + "20" : theme.backgroundSecondary,
                      borderColor: priority === p ? pColor : "transparent",
                    },
                  ]}
                >
                  <View style={[styles.priorityDot, { backgroundColor: pColor }]} />
                  <Text
                    style={[
                      styles.priorityText,
                      { color: priority === p ? pColor : theme.textSecondary },
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  descInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
    textAlignVertical: "top",
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    width: 48,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "right",
  },
  timeScroll: {
    flex: 1,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  timeChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 14,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 14,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
  },
  priorityOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
});
