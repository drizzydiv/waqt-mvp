import React, { useMemo, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import MonthView from "@/components/calendar/MonthView";
import { format, addMonths, subMonths } from "date-fns";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { events, selectedDate, setSelectedDate, profile, hasOnboarded } = useApp();

  useEffect(() => {
    if (!hasOnboarded) {
      router.replace("/onboarding");
    }
  }, [hasOnboarded]);

  const currentDate = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);
  const monthLabel = format(currentDate, "MMMM yyyy");

  const navigateMonth = (dir: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const goToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date();
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  const handleDateTap = (dateStr: string) => {
    setSelectedDate(dateStr);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/day-detail", params: { date: dateStr } });
  };

  if (!hasOnboarded) return null;

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerGreeting, { color: theme.textSecondary }]}>
              {profile ? `Hi, ${profile.name}` : "Calendar"}
            </Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{monthLabel}</Text>
          </View>
          <Pressable onPress={goToToday} style={[styles.todayButton, { borderColor: theme.tint }]}>
            <Text style={[styles.todayButtonText, { color: theme.tint }]}>Today</Text>
          </Pressable>
        </View>
        <View style={styles.navRow}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
            <Feather name="chevron-right" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      <MonthView selectedDate={selectedDate} onSelectDate={handleDateTap} events={events} />

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
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerGreeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
  },
  todayButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayButtonText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
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
