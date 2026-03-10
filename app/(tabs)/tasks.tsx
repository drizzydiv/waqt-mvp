import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import Colors from "@/constants/colors";
import { useApp, Task } from "@/contexts/AppContext";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const CATEGORIES = ["personal", "work", "school", "health", "errands"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;
const CATEGORY_COLORS: Record<string, string> = {
  personal: "#1E88E5",
  work: "#8E24AA",
  school: "#FF9800",
  health: "#43A047",
  errands: "#00897B",
};

function TaskItem({
  task,
  onToggle,
  onDelete,
  theme,
}: {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, { damping: 15 }, () => {
      scale.value = withSpring(1);
    });
    onToggle(task.id);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDelete)(task.id);
    });
  };

  const categoryColor = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.personal;
  const priorityColor = (Colors.priority as any)[task.priority] || Colors.priority.medium;

  const formatDueInfo = () => {
    if (!task.dueDate) return null;
    const parts: string[] = [];
    try {
      const d = new Date(task.dueDate + "T12:00:00");
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) parts.push("Today");
      else if (diff === 1) parts.push("Tomorrow");
      else if (diff === -1) parts.push("Yesterday");
      else if (diff > 0 && diff <= 7) {
        parts.push(d.toLocaleDateString("en-US", { weekday: "short" }));
      } else {
        parts.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      }
    } catch {
      parts.push(task.dueDate);
    }
    if (task.dueTime) {
      try {
        const [h, m] = task.dueTime.split(":");
        const hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        parts.push(`${displayHour}:${m} ${ampm}`);
      } catch {}
    }
    return parts.join(" at ");
  };

  const dueInfo = formatDueInfo();

  return (
    <Animated.View style={animatedStyle}>
      <View style={[styles.taskCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Pressable onPress={handleToggle} style={styles.checkbox} hitSlop={8}>
          {task.completed ? (
            <View style={[styles.checkboxFilled, { backgroundColor: categoryColor }]}>
              <Feather name="check" size={12} color="#fff" />
            </View>
          ) : (
            <View style={[styles.checkboxEmpty, { borderColor: categoryColor }]} />
          )}
        </Pressable>
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskTitle,
              { color: task.completed ? theme.textTertiary : theme.text },
              task.completed && styles.taskTitleCompleted,
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          {dueInfo ? (
            <View style={styles.taskMeta}>
              <Feather name="clock" size={11} color={theme.textTertiary} />
              <Text style={[styles.taskDue, { color: theme.textTertiary }]}>{dueInfo}</Text>
            </View>
          ) : null}
          {task.notes ? (
            <Text style={[styles.taskNotes, { color: theme.textTertiary }]} numberOfLines={1}>
              {task.notes}
            </Text>
          ) : null}
        </View>
        <View style={styles.taskRight}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Feather name="x" size={16} color={theme.textTertiary} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function TasksScreen() {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { tasks, isTasksLoading, createTask, toggleTask, deleteTask, events } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("personal");
  const [newPriority, setNewPriority] = useState<string>("medium");
  const [newDueDate, setNewDueDate] = useState<string>("today");
  const [newLinkedEventId, setNewLinkedEventId] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { todayTasks, upcomingTasks, completedTasks, todayProgress } = useMemo(() => {
    const todayItems: Task[] = [];
    const upcomingItems: Task[] = [];
    const completedItems: Task[] = [];

    for (const task of tasks) {
      if (task.completed) {
        completedItems.push(task);
      } else if (!task.dueDate || task.dueDate <= today) {
        todayItems.push(task);
      } else {
        upcomingItems.push(task);
      }
    }

    const todayAll = tasks.filter((t) => !t.dueDate || t.dueDate <= today);
    const todayDone = todayAll.filter((t) => t.completed);
    const progress = todayAll.length > 0 ? todayDone.length / todayAll.length : 0;

    return {
      todayTasks: todayItems,
      upcomingTasks: upcomingItems,
      completedTasks: completedItems,
      todayProgress: { done: todayDone.length, total: todayAll.length, percent: progress },
    };
  }, [tasks, today]);

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const nextWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const resolvedDueDate = useMemo(() => {
    if (newDueDate === "today") return today;
    if (newDueDate === "tomorrow") return tomorrow;
    if (newDueDate === "next_week") return nextWeek;
    if (newDueDate === "none") return undefined;
    return today;
  }, [newDueDate, today, tomorrow, nextWeek]);

  const eventsForLinking = useMemo(() => {
    if (!resolvedDueDate) return events;
    return events.filter((e) => e.date === resolvedDueDate);
  }, [events, resolvedDueDate]);

  const handleAddTask = useCallback(async () => {
    if (!newTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await createTask({
      title: newTitle.trim(),
      category: newCategory,
      color: CATEGORY_COLORS[newCategory] || "blue",
      priority: newPriority,
      dueDate: resolvedDueDate,
      linkedEventId: newLinkedEventId,
    });
    setNewTitle("");
    setNewDueDate("today");
    setNewLinkedEventId(null);
    setShowAddForm(false);
  }, [newTitle, newCategory, newPriority, resolvedDueDate, newLinkedEventId, createTask]);

  const handleToggle = useCallback(async (id: number) => {
    await toggleTask(id);
  }, [toggleTask]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteTask(id);
  }, [deleteTask]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const sections = useMemo(() => {
    const result: { title: string; data: Task[]; collapsible?: boolean; collapsed?: boolean }[] = [];
    if (todayTasks.length > 0) result.push({ title: "Today", data: todayTasks });
    if (upcomingTasks.length > 0) result.push({ title: "Upcoming", data: upcomingTasks });
    if (completedTasks.length > 0) result.push({ title: "Completed", data: completedTasks, collapsible: true, collapsed: !showCompleted });
    return result;
  }, [todayTasks, upcomingTasks, completedTasks, showCompleted]);

  const flatData = useMemo(() => {
    const items: ({ type: "header"; title: string; count: number; collapsible?: boolean; collapsed?: boolean } | { type: "task"; task: Task })[] = [];
    for (const section of sections) {
      items.push({ type: "header", title: section.title, count: section.data.length, collapsible: section.collapsible, collapsed: section.collapsed });
      if (!section.collapsed) {
        for (const task of section.data) {
          items.push({ type: "task", task });
        }
      }
    }
    return items;
  }, [sections]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Tasks</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddForm(!showAddForm);
            }}
            hitSlop={8}
          >
            <Feather name={showAddForm ? "x" : "plus"} size={24} color={theme.tint} />
          </Pressable>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.tint,
                  width: `${todayProgress.percent * 100}%` as any,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {todayProgress.done}/{todayProgress.total} done today
          </Text>
        </View>
      </View>

      {showAddForm ? (
        <View style={[styles.addForm, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TextInput
            style={[styles.addInput, { color: theme.text, backgroundColor: theme.backgroundSecondary }]}
            placeholder="What needs to be done?"
            placeholderTextColor={theme.textTertiary}
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
          />
          <View style={styles.addOptions}>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setNewCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: newCategory === cat ? CATEGORY_COLORS[cat] + "20" : theme.backgroundSecondary,
                      borderColor: newCategory === cat ? CATEGORY_COLORS[cat] : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: newCategory === cat ? CATEGORY_COLORS[cat] : theme.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setNewPriority(p)}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: newPriority === p ? (Colors.priority as any)[p] + "20" : theme.backgroundSecondary,
                      borderColor: newPriority === p ? (Colors.priority as any)[p] : "transparent",
                    },
                  ]}
                >
                  <View style={[styles.priorityDotSmall, { backgroundColor: (Colors.priority as any)[p] }]} />
                  <Text
                    style={[
                      styles.priorityChipText,
                      { color: newPriority === p ? (Colors.priority as any)[p] : theme.textSecondary },
                    ]}
                  >
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.dueDateRow}>
              <Feather name="calendar" size={14} color={theme.textSecondary} />
              {(["today", "tomorrow", "next_week", "none"] as const).map((opt) => {
                const labels: Record<string, string> = { today: "Today", tomorrow: "Tomorrow", next_week: "Next week", none: "No date" };
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setNewDueDate(opt);
                      setNewLinkedEventId(null);
                    }}
                    style={[
                      styles.dueDateChip,
                      {
                        backgroundColor: newDueDate === opt ? theme.tint + "20" : theme.backgroundSecondary,
                        borderColor: newDueDate === opt ? theme.tint : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.dueDateChipText, { color: newDueDate === opt ? theme.tint : theme.textSecondary }]}>
                      {labels[opt]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {eventsForLinking.length > 0 ? (
              <View style={styles.linkSection}>
                <View style={styles.linkHeader}>
                  <Feather name="link" size={14} color={theme.textSecondary} />
                  <Text style={[styles.linkLabel, { color: theme.textSecondary }]}>Link to event</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Pressable
                    onPress={() => setNewLinkedEventId(null)}
                    style={[
                      styles.linkChip,
                      {
                        backgroundColor: newLinkedEventId === null ? theme.tint + "20" : theme.backgroundSecondary,
                        borderColor: newLinkedEventId === null ? theme.tint : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.linkChipText, { color: newLinkedEventId === null ? theme.tint : theme.textSecondary }]}>
                      None
                    </Text>
                  </Pressable>
                  {eventsForLinking.map((evt) => (
                    <Pressable
                      key={evt.id}
                      onPress={() => setNewLinkedEventId(evt.id)}
                      style={[
                        styles.linkChip,
                        {
                          backgroundColor: newLinkedEventId === evt.id ? theme.tint + "20" : theme.backgroundSecondary,
                          borderColor: newLinkedEventId === evt.id ? theme.tint : "transparent",
                        },
                      ]}
                    >
                      <View style={[styles.linkDot, { backgroundColor: (Colors.event as any)[evt.color] || Colors.event.blue }]} />
                      <Text style={[styles.linkChipText, { color: newLinkedEventId === evt.id ? theme.tint : theme.textSecondary }]} numberOfLines={1}>
                        {evt.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={handleAddTask}
            style={[styles.addButton, { backgroundColor: theme.tint, opacity: newTitle.trim() ? 1 : 0.5 }]}
            disabled={!newTitle.trim()}
          >
            <Text style={styles.addButtonText}>Add Task</Text>
          </Pressable>
        </View>
      ) : null}

      {tasks.length === 0 && !isTasksLoading ? (
        <View style={styles.emptyContainer}>
          <Feather name="check-square" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No tasks yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
            Tap + to add your first task
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, index) => (item.type === "header" ? `header-${item.title}` : `task-${item.task.id}`)}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Pressable
                  style={styles.sectionHeader}
                  onPress={
                    item.collapsible
                      ? () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowCompleted(!showCompleted);
                        }
                      : undefined
                  }
                >
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.sectionCount, { color: theme.textTertiary }]}>{item.count}</Text>
                  {item.collapsible ? (
                    <Feather
                      name={item.collapsed ? "chevron-right" : "chevron-down"}
                      size={16}
                      color={theme.textTertiary}
                    />
                  ) : null}
                </Pressable>
              );
            }
            return (
              <TaskItem
                task={item.task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                theme={theme}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={flatData.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
  },
  progressContainer: {
    marginTop: 12,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  addForm: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  addInput: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addOptions: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  priorityDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  addButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    paddingBottom: 120,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  checkboxFilled: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  taskContent: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through" as const,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskDue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  taskNotes: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  taskRight: {
    alignItems: "center",
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  dueDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  dueDateChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  linkSection: {
    gap: 6,
  },
  linkHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    gap: 5,
    maxWidth: 150,
  },
  linkChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  linkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
