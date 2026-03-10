import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, Platform } from "react-native";
import { useThemeColors } from "@/constants/colors";
import Colors from "@/constants/colors";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday } from "date-fns";
import { CalendarEvent } from "@/contexts/AppContext";

interface MonthViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  events: CalendarEvent[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_EVENTS = 2;

function getEventColor(color: string): string {
  return (Colors.event as any)[color] || Colors.event.blue;
}

export default function MonthView({ selectedDate, onSelectDate, events }: MonthViewProps) {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);

  const currentDate = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    for (const date in map) {
      map[date].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }
    return map;
  }, [events]);

  return (
    <View style={styles.container}>
      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: theme.textTertiary }]}>{day}</Text>
          </View>
        ))}
      </View>
      <View style={styles.daysGrid}>
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = dateStr === selectedDate;
          const dayIsToday = isToday(day);
          const dayEvents = eventsByDate[dateStr] || [];
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const remaining = dayEvents.length - MAX_VISIBLE_EVENTS;

          return (
            <Pressable
              key={dateStr}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: theme.tint + "18" },
                dayIsToday && !isSelected && { backgroundColor: theme.tintLight },
              ]}
              onPress={() => onSelectDate(dateStr)}
              testID={`day-${dateStr}`}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isCurrentMonth ? theme.text : theme.textTertiary },
                  isSelected && { color: theme.tint, fontFamily: "Inter_600SemiBold" },
                  dayIsToday && !isSelected && { color: theme.tint, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {format(day, "d")}
              </Text>
              <View style={styles.eventsColumn}>
                {visibleEvents.map((event, i) => (
                  <View
                    key={event.id || i}
                    style={[styles.eventChip, { backgroundColor: getEventColor(event.color) + "25" }]}
                  >
                    <View style={[styles.eventBar, { backgroundColor: getEventColor(event.color) }]} />
                    <Text
                      style={[styles.eventTitle, { color: getEventColor(event.color) }]}
                      numberOfLines={1}
                    >
                      {event.title}
                    </Text>
                  </View>
                ))}
                {remaining > 0 ? (
                  <Text style={[styles.moreText, { color: theme.textTertiary }]}>
                    +{remaining} more
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    flex: 1,
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
  },
  dayCell: {
    width: `${100 / 7}%` as any,
    minHeight: 72,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: "center",
    borderRadius: 8,
  },
  dayText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  eventsColumn: {
    width: "100%",
    gap: 1,
  },
  eventChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    overflow: "hidden",
  },
  eventBar: {
    width: 2,
    height: 10,
    borderRadius: 1,
    marginRight: 2,
  },
  eventTitle: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  moreText: {
    fontSize: 8,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
