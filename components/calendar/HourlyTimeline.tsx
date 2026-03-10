import React, { useRef, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, ScrollView, Platform, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import Colors from "@/constants/colors";
import { CalendarEvent, Task } from "@/contexts/AppContext";
import { format, isToday } from "date-fns";
import * as Haptics from "expo-haptics";

const HOUR_HEIGHT = 60;
const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_LABEL_WIDTH = 52;
const EVENT_LEFT = TIME_LABEL_WIDTH + 8;

interface HourlyTimelineProps {
  date: string;
  events: CalendarEvent[];
  onDeleteEvent: (id: number) => void;
  tasks?: Task[];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function timeToY(time: string): number {
  const minutes = timeToMinutes(time);
  return ((minutes / 60) - START_HOUR) * HOUR_HEIGHT;
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

interface LayoutEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

function layoutEvents(dayEvents: CalendarEvent[]): LayoutEvent[] {
  if (dayEvents.length === 0) return [];

  const items = dayEvents.map((event) => {
    const startMin = timeToMinutes(event.startTime);
    let endMin = event.endTime ? timeToMinutes(event.endTime) : startMin + 60;
    if (endMin <= startMin) endMin = startMin + 30;
    const top = ((startMin / 60) - START_HOUR) * HOUR_HEIGHT;
    const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);
    return { event, startMin, endMin, top, height };
  });

  items.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const clusters: typeof items[] = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.startMin < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMin;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const result: LayoutEvent[] = [];

  for (const cluster of clusters) {
    const columns: number[] = [];

    for (const item of cluster) {
      let col = 0;
      while (col < columns.length && columns[col] > item.startMin) {
        col++;
      }
      if (col >= columns.length) columns.push(0);
      columns[col] = item.endMin;

      result.push({
        event: item.event,
        top: item.top,
        height: item.height,
        column: col,
        totalColumns: 0,
      });
    }

    const totalCols = columns.length;
    for (let i = result.length - cluster.length; i < result.length; i++) {
      result[i].totalColumns = totalCols;
    }
  }

  return result;
}

export default function HourlyTimeline({ date, events, onDeleteEvent, tasks = [] }: HourlyTimelineProps) {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);
  const { width: screenWidth } = useWindowDimensions();
  const eventAreaWidth = screenWidth - EVENT_LEFT - 16;
  const scrollRef = useRef<ScrollView>(null);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const viewingToday = useMemo(() => {
    try {
      return isToday(new Date(date + "T12:00:00"));
    } catch {
      return false;
    }
  }, [date]);

  useEffect(() => {
    if (!viewingToday) return;
    const interval = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, [viewingToday]);

  useEffect(() => {
    if (viewingToday && scrollRef.current) {
      const scrollToHour = Math.max(0, Math.floor(nowMinutes / 60) - 1);
      const y = (scrollToHour - START_HOUR) * HOUR_HEIGHT;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y, animated: false });
      }, 100);
    }
  }, [date, viewingToday]);

  const dayEvents = useMemo(() =>
    events
      .filter((e) => e.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, date]
  );

  const layoutItems = useMemo(() => layoutEvents(dayEvents), [dayEvents]);

  const linkedTasksMap = useMemo(() => {
    const map: Record<number, Task[]> = {};
    for (const task of tasks) {
      if (task.linkedEventId) {
        if (!map[task.linkedEventId]) map[task.linkedEventId] = [];
        map[task.linkedEventId].push(task);
      }
    }
    return map;
  }, [tasks]);

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(date + "T12:00:00");
      return format(d, "EEEE, MMMM d");
    } catch {
      return date;
    }
  }, [date]);

  const formatTime = (time: string) => {
    try {
      const [h, m] = time.split(":");
      const hour = parseInt(h);
      const min = (m || "00").padStart(2, "0");
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${min} ${ampm}`;
    } catch {
      return time;
    }
  };

  const nowY = ((nowMinutes / 60) - START_HOUR) * HOUR_HEIGHT;

  const hours = useMemo(() => {
    const arr = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      arr.push(h);
    }
    return arr;
  }, []);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.dateHeader, { color: theme.textSecondary }]}>{formattedDate}</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ height: TOTAL_HOURS * HOUR_HEIGHT + 40 }}
      >
        {hours.map((hour) => (
          <View key={hour} style={[styles.hourRow, { top: (hour - START_HOUR) * HOUR_HEIGHT }]}>
            <Text style={[styles.hourLabel, { color: theme.textTertiary }]}>
              {formatHourLabel(hour)}
            </Text>
            <View style={[styles.hourLine, { backgroundColor: theme.border }]} />
          </View>
        ))}

        {layoutItems.map((item) => {
          const eventColor = (Colors.event as any)[item.event.color] || Colors.event.blue;
          const linkedTasks = linkedTasksMap[item.event.id] || [];
          const colWidthPx = eventAreaWidth / item.totalColumns;

          return (
            <Pressable
              key={item.event.id}
              style={[
                styles.eventBlock,
                {
                  top: item.top,
                  height: Math.max(item.height, 28),
                  left: EVENT_LEFT + (item.column * colWidthPx),
                  width: colWidthPx - 4,
                  backgroundColor: eventColor + "18",
                  borderLeftColor: eventColor,
                },
              ]}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDeleteEvent(item.event.id);
              }}
            >
              <Text style={[styles.eventBlockTitle, { color: theme.text }]} numberOfLines={1}>
                {item.event.title}
              </Text>
              {item.height >= 36 ? (
                <Text style={[styles.eventBlockTime, { color: theme.textSecondary }]} numberOfLines={1}>
                  {formatTime(item.event.startTime)}
                  {item.event.endTime ? ` - ${formatTime(item.event.endTime)}` : ""}
                </Text>
              ) : null}
              {item.height >= 56 && linkedTasks.length > 0 ? (
                <View style={styles.linkedTasksRow}>
                  {linkedTasks.map((task) => (
                    <View key={task.id} style={styles.linkedTaskBadge}>
                      <Feather
                        name={task.completed ? "check-circle" : "circle"}
                        size={10}
                        color={task.completed ? theme.tint : theme.textTertiary}
                      />
                      <Text
                        style={[
                          styles.linkedTaskName,
                          { color: task.completed ? theme.textTertiary : theme.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {viewingToday ? (
          <View style={[styles.nowIndicator, { top: nowY }]}>
            <View style={[styles.nowDot, { backgroundColor: theme.destructive }]} />
            <View style={[styles.nowLine, { backgroundColor: theme.destructive }]} />
          </View>
        ) : null}
      </ScrollView>

      {dayEvents.length === 0 ? (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Feather name="calendar" size={32} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No events this day</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  dateHeader: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  hourRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    width: TIME_LABEL_WIDTH,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    paddingRight: 8,
    marginTop: -7,
  },
  hourLine: {
    flex: 1,
    height: 0.5,
  },
  eventBlock: {
    position: "absolute",
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  eventBlockTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  eventBlockTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  linkedTasksRow: {
    marginTop: 3,
    gap: 2,
  },
  linkedTaskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linkedTaskName: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  nowIndicator: {
    position: "absolute",
    left: TIME_LABEL_WIDTH - 4,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nowLine: {
    flex: 1,
    height: 1.5,
  },
  emptyOverlay: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
