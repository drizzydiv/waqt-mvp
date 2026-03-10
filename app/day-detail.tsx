import React from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import HourlyTimeline from "@/components/calendar/HourlyTimeline";
import { useLocalSearchParams, router } from "expo-router";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

export default function DayDetailSheet() {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { events, deleteEvent, tasks } = useApp();
  const { date } = useLocalSearchParams<{ date: string }>();

  const selectedDate = date || format(new Date(), "yyyy-MM-dd");

  const formattedDate = (() => {
    try {
      return format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d");
    } catch {
      return selectedDate;
    }
  })();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dateTitle, { color: theme.text }]}>{formattedDate}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <HourlyTimeline date={selectedDate} events={events} onDeleteEvent={deleteEvent} tasks={tasks} />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.tint }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({ pathname: "/create-event", params: { date: selectedDate } });
        }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  dateTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
