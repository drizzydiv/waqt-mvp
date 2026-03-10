import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl, getDeviceId } from "@/lib/query-client";
import { fetch } from "expo/fetch";

export interface UserProfile {
  id: number;
  name: string;
  type: string;
  schoolHours?: string | null;
  workType?: string | null;
  workHours?: string | null;
  scheduleDetails?: string | null;
  notificationsEnabled: boolean;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  category: string;
  color: string;
  priority: string;
  profileId?: number | null;
}

export interface Task {
  id: number;
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  category: string;
  color: string;
  priority: string;
  completed: boolean;
  completedAt?: string | null;
  linkedEventId?: number | null;
}

export interface ParsedEvent {
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  category: string;
  color: string;
  priority: string;
}

interface AppContextValue {
  profile: UserProfile | null;
  isProfileLoading: boolean;
  hasOnboarded: boolean;
  setHasOnboarded: (val: boolean) => void;
  createProfile: (data: Omit<UserProfile, "id">) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  resetProfile: () => Promise<void>;

  events: CalendarEvent[];
  isEventsLoading: boolean;
  refreshEvents: () => void;
  createEvent: (event: Omit<CalendarEvent, "id">) => Promise<void>;
  createBatchEvents: (events: ParsedEvent[]) => Promise<CalendarEvent[]>;
  deleteEvent: (id: number) => Promise<void>;
  updateEvent: (id: number, data: Partial<CalendarEvent>) => Promise<void>;

  tasks: Task[];
  isTasksLoading: boolean;
  refreshTasks: () => void;
  createTask: (task: Omit<Task, "id" | "completed" | "completedAt">) => Promise<void>;
  updateTask: (id: number, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;

  parseRant: (text: string, onChunk: (chunk: string) => void) => Promise<string>;

  selectedDate: string;
  setSelectedDate: (date: string) => void;
  calendarView: "month" | "week" | "day";
  setCalendarView: (view: "month" | "week" | "day") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasOnboarded, setHasOnboardedState] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");

  useEffect(() => {
    AsyncStorage.getItem("mujo_onboarded").then((val) => {
      if (val === "true") setHasOnboardedState(true);
      setOnboardingChecked(true);
    });
  }, []);

  const setHasOnboarded = useCallback(async (val: boolean) => {
    setHasOnboardedState(val);
    await AsyncStorage.setItem("mujo_onboarded", val ? "true" : "false");
  }, []);

  const profileQuery = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: hasOnboarded,
    retry: false,
  });

  const eventsQuery = useQuery<CalendarEvent[]>({
    queryKey: ["/api/events"],
    enabled: hasOnboarded,
  });

  const tasksQuery = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: hasOnboarded,
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: Omit<UserProfile, "id">) => {
      const res = await apiRequest("POST", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile> & { id?: number }) => {
      const id = data.id || profileQuery.data?.id;
      if (!id) throw new Error("No profile ID");
      const res = await apiRequest("PUT", `/api/profile/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (event: Omit<CalendarEvent, "id">) => {
      const res = await apiRequest("POST", "/api/events", event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CalendarEvent> & { id: number }) => {
      const res = await apiRequest("PUT", `/api/events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: Omit<Task, "id" | "completed" | "completedAt">) => {
      const res = await apiRequest("POST", "/api/tasks", task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: number }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}/toggle`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const createBatchEvents = useCallback(async (eventsList: ParsedEvent[]): Promise<CalendarEvent[]> => {
    const res = await apiRequest("POST", "/api/events/batch", { events: eventsList });
    const created = await res.json();
    queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    return created;
  }, [queryClient]);

  const resetProfile = useCallback(async () => {
    await apiRequest("DELETE", "/api/profile");
    await AsyncStorage.removeItem("mujo_onboarded");
    queryClient.setQueryData(["/api/profile"], null);
    queryClient.setQueryData(["/api/events"], []);
    queryClient.setQueryData(["/api/tasks"], []);
    queryClient.removeQueries({ queryKey: ["/api/profile"] });
    queryClient.removeQueries({ queryKey: ["/api/events"] });
    queryClient.removeQueries({ queryKey: ["/api/tasks"] });
    setHasOnboardedState(false);
  }, [queryClient]);

  const parseRant = useCallback(async (text: string, onChunk: (chunk: string) => void): Promise<string> => {
    const baseUrl = getApiUrl();
    const profileData = profileQuery.data;
    const deviceId = await getDeviceId();

    const response = await fetch(`${baseUrl}api/parse-rant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "X-Device-Id": deviceId,
      },
      body: JSON.stringify({
        text,
        profileContext: profileData ? {
          name: profileData.name,
          type: profileData.type,
          schoolHours: profileData.schoolHours,
          workType: profileData.workType,
          workHours: profileData.workHours,
          scheduleDetails: profileData.scheduleDetails,
        } : undefined,
      }),
    });

    if (!response.ok) throw new Error("Failed to parse rant");

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            fullContent += parsed.content;
            onChunk(parsed.content);
          }
        } catch {}
      }
    }

    return fullContent;
  }, [profileQuery.data]);

  const value = useMemo(() => ({
    profile: profileQuery.data || null,
    isProfileLoading: profileQuery.isLoading,
    hasOnboarded,
    setHasOnboarded,
    createProfile: async (data: Omit<UserProfile, "id">) => {
      await createProfileMutation.mutateAsync(data);
    },
    updateProfile: async (data: Partial<UserProfile>) => {
      await updateProfileMutation.mutateAsync(data);
    },
    resetProfile,
    events: eventsQuery.data || [],
    isEventsLoading: eventsQuery.isLoading,
    refreshEvents: () => queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
    createEvent: async (event: Omit<CalendarEvent, "id">) => {
      await createEventMutation.mutateAsync(event);
    },
    createBatchEvents,
    deleteEvent: async (id: number) => {
      await deleteEventMutation.mutateAsync(id);
    },
    updateEvent: async (id: number, data: Partial<CalendarEvent>) => {
      await updateEventMutation.mutateAsync({ id, ...data });
    },
    tasks: tasksQuery.data || [],
    isTasksLoading: tasksQuery.isLoading,
    refreshTasks: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
    createTask: async (task: Omit<Task, "id" | "completed" | "completedAt">) => {
      await createTaskMutation.mutateAsync(task);
    },
    updateTask: async (id: number, data: Partial<Task>) => {
      await updateTaskMutation.mutateAsync({ id, ...data });
    },
    deleteTask: async (id: number) => {
      await deleteTaskMutation.mutateAsync(id);
    },
    toggleTask: async (id: number) => {
      await toggleTaskMutation.mutateAsync(id);
    },
    parseRant,
    selectedDate,
    setSelectedDate,
    calendarView,
    setCalendarView,
  }), [
    profileQuery.data, profileQuery.isLoading, hasOnboarded, setHasOnboarded,
    createProfileMutation, updateProfileMutation, eventsQuery.data, eventsQuery.isLoading,
    createEventMutation, deleteEventMutation, updateEventMutation,
    tasksQuery.data, tasksQuery.isLoading,
    createTaskMutation, updateTaskMutation, deleteTaskMutation, toggleTaskMutation,
    createBatchEvents, resetProfile, parseRant, selectedDate, calendarView, queryClient,
  ]);

  if (!onboardingChecked) return null;

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
