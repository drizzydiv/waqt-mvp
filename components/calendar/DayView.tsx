import React from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import Colors from "@/constants/colors";
import { CalendarEvent, Task } from "@/contexts/AppContext";
import { format, parse } from "date-fns";
import * as Haptics from "expo-haptics";

interface DayViewProps {
  date: string;
  events: CalendarEvent[];
  onDeleteEvent: (id: number) => void;
  tasks?: Task[];
}

export default function DayView({ date, events, onDeleteEvent, tasks = [] }: DayViewProps) {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);

  const dayEvents = events
    .filter((e) => e.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const linkedTasksMap: Record<number, Task[]> = {};
  for (const task of tasks) {
    if (task.linkedEventId) {
      if (!linkedTasksMap[task.linkedEventId]) linkedTasksMap[task.linkedEventId] = [];
      linkedTasksMap[task.linkedEventId].push(task);
    }
  }

  const formattedDate = (() => {
    try {
      const d = new Date(date + "T12:00:00");
      return format(d, "EEEE, MMMM d");
    } catch {
      return date;
    }
  })();

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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return "alert-circle";
      case "low": return "minus-circle";
      default: return "circle";
    }
  };

  if (dayEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="calendar" size={40} color={theme.textTertiary} />
        <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No events</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
          Tap + to add an event or use the AI tab
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.dateHeader, { color: theme.textSecondary }]}>{formattedDate}</Text>
      {dayEvents.map((event) => {
        const eventColor = (Colors.event as any)[event.color] || Colors.event.blue;
        return (
          <View key={event.id}>
            <View
              style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={[styles.colorBar, { backgroundColor: eventColor }]} />
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onDeleteEvent(event.id);
                    }}
                    hitSlop={8}
                  >
                    <Feather name="trash-2" size={16} color={theme.textTertiary} />
                  </Pressable>
                </View>
                <View style={styles.eventMeta}>
                  <Feather name="clock" size={12} color={theme.textSecondary} />
                  <Text style={[styles.eventTime, { color: theme.textSecondary }]}>
                    {formatTime(event.startTime)}
                    {event.endTime ? ` - ${formatTime(event.endTime)}` : ""}
                  </Text>
                </View>
                {event.description ? (
                  <Text style={[styles.eventDesc, { color: theme.textTertiary }]} numberOfLines={2}>
                    {event.description}
                  </Text>
                ) : null}
                <View style={styles.eventTags}>
                  <View style={[styles.tag, { backgroundColor: eventColor + "20" }]}>
                    <Text style={[styles.tagText, { color: eventColor }]}>{event.category}</Text>
                  </View>
                  <View style={styles.priorityBadge}>
                    <Feather
                      name={getPriorityIcon(event.priority) as any}
                      size={11}
                      color={(Colors.priority as any)[event.priority] || Colors.priority.medium}
                    />
                    <Text style={[styles.priorityText, { color: (Colors.priority as any)[event.priority] || Colors.priority.medium }]}>
                      {event.priority}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {linkedTasksMap[event.id]?.map((task) => (
              <View key={task.id} style={[styles.linkedTask, { borderColor: theme.cardBorder }]}>
                <Feather
                  name={task.completed ? "check-circle" : "circle"}
                  size={14}
                  color={task.completed ? theme.tint : theme.textTertiary}
                />
                <Text
                  style={[
                    styles.linkedTaskText,
                    { color: task.completed ? theme.textTertiary : theme.textSecondary },
                    task.completed && { textDecorationLine: "line-through" as const },
                  ]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dateHeader: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  eventCard: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  colorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  eventTime: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  eventDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  eventTags: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  priorityText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  linkedTask: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 20,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderLeftWidth: 2,
  },
  linkedTaskText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
