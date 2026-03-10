import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, useColorScheme,
  Platform, Animated, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { format, addDays, startOfWeek, addWeeks } from "date-fns";

type Step = "name" | "type" | "student_details" | "work_details" | "schedule" | "done";

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { createProfile, setHasOnboarded, createBatchEvents } = useApp();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<"student" | "working" | "">("");
  const [schoolHours, setSchoolHours] = useState("");
  const [workType, setWorkType] = useState<"remote" | "in-person" | "hybrid" | "">("");
  const [workHours, setWorkHours] = useState("");
  const [scheduleDetails, setScheduleDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (next: Step) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    if (step === "name" && name.trim()) {
      animateTransition("type");
    } else if (step === "type" && userType) {
      animateTransition(userType === "student" ? "student_details" : "work_details");
    } else if (step === "student_details") {
      animateTransition("schedule");
    } else if (step === "work_details") {
      animateTransition("schedule");
    } else if (step === "schedule") {
      handleFinish();
    }
  };

  const parseScheduleToEvents = () => {
    const events: any[] = [];
    const today = new Date();
    const weeksToGenerate = 4;

    if (userType === "student" && schoolHours) {
      const parsed = parseTimeRange(schoolHours);
      const days = parseDays(schoolHours);

      if (parsed) {
        for (let w = 0; w < weeksToGenerate; w++) {
          const weekStart = startOfWeek(addWeeks(today, w));
          for (let d = 0; d < 7; d++) {
            const date = addDays(weekStart, d);
            const dayOfWeek = date.getDay();
            if (days.includes(dayOfWeek)) {
              events.push({
                title: "School",
                date: format(date, "yyyy-MM-dd"),
                startTime: parsed.start,
                endTime: parsed.end,
                category: "school",
                color: "green",
                priority: "medium",
              });
            }
          }
        }
      }
    }

    if (userType === "working") {
      const hoursPerWeek = Math.min(Math.max(parseInt(workHours) || 40, 10), 80);
      const hoursPerDay = Math.round(hoursPerWeek / 5);
      const startHour = 9;
      const endHour = Math.min(startHour + hoursPerDay, 20);
      const startTime = `${String(startHour).padStart(2, "0")}:00`;
      const endTime = `${String(endHour).padStart(2, "0")}:00`;

      for (let w = 0; w < weeksToGenerate; w++) {
        const weekStart = startOfWeek(addWeeks(today, w));
        for (let d = 1; d <= 5; d++) {
          const date = addDays(weekStart, d);
          events.push({
            title: "Work",
            date: format(date, "yyyy-MM-dd"),
            startTime,
            endTime,
            category: "work",
            color: "blue",
            priority: "medium",
          });
        }
      }
    }

    return events;
  };

  const parseTimeRange = (text: string): { start: string; end: string } | null => {
    const convertTo24 = (h: number, m: number, ampm: string): string => {
      let hour = h;
      const ap = ampm.toLowerCase();
      if (ap === "pm" && hour !== 12) hour += 12;
      if (ap === "am" && hour === 12) hour = 0;
      return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const withMinutesAmPm = text.match(
      /(\d{1,2}):(\d{2})\s*(am|pm)\s*(?:to|-)\s*(\d{1,2}):(\d{2})\s*(am|pm)/i
    );
    if (withMinutesAmPm) {
      return {
        start: convertTo24(parseInt(withMinutesAmPm[1]), parseInt(withMinutesAmPm[2]), withMinutesAmPm[3]),
        end: convertTo24(parseInt(withMinutesAmPm[4]), parseInt(withMinutesAmPm[5]), withMinutesAmPm[6]),
      };
    }

    const simpleAmPm = text.match(
      /(\d{1,2})\s*(am|pm)\s*(?:to|-)\s*(\d{1,2})\s*(am|pm)/i
    );
    if (simpleAmPm) {
      return {
        start: convertTo24(parseInt(simpleAmPm[1]), 0, simpleAmPm[2]),
        end: convertTo24(parseInt(simpleAmPm[3]), 0, simpleAmPm[4]),
      };
    }

    const plain = text.match(/(\d{1,2})\s*(?:to|-)\s*(\d{1,2})/);
    if (plain) {
      const s = parseInt(plain[1]);
      const e = parseInt(plain[2]);
      return {
        start: `${String(s).padStart(2, "0")}:00`,
        end: `${String(e).padStart(2, "0")}:00`,
      };
    }

    return null;
  };

  const parseDays = (text: string): number[] => {
    const dayMap: Record<string, number> = {
      sun: 0, sunday: 0,
      mon: 1, monday: 1,
      tue: 2, tues: 2, tuesday: 2,
      wed: 3, wednesday: 3,
      thu: 4, thur: 4, thurs: 4, thursday: 4,
      fri: 5, friday: 5,
      sat: 6, saturday: 6,
    };

    const lower = text.toLowerCase();

    const rangeMatch = lower.match(/(mon|tue|wed|thu|fri|sat|sun)\w*\s*[-–to]+\s*(mon|tue|wed|thu|fri|sat|sun)\w*/i);
    if (rangeMatch) {
      const startDay = dayMap[rangeMatch[1]] ?? -1;
      const endDay = dayMap[rangeMatch[2]] ?? -1;
      if (startDay >= 0 && endDay >= 0) {
        const days: number[] = [];
        for (let d = startDay; d <= endDay; d++) {
          days.push(d);
        }
        if (days.length > 0) return days;
      }
    }

    const found: number[] = [];
    for (const [key, val] of Object.entries(dayMap)) {
      if (lower.includes(key) && !found.includes(val)) {
        found.push(val);
      }
    }

    return found.length > 0 ? found : [1, 2, 3, 4, 5];
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await createProfile({
        name: name.trim(),
        type: userType,
        schoolHours: schoolHours || null,
        workType: workType || null,
        workHours: workHours || null,
        scheduleDetails: scheduleDetails || null,
        notificationsEnabled: true,
      } as any);

      const scheduleEvents = parseScheduleToEvents();
      if (scheduleEvents.length > 0) {
        try {
          await createBatchEvents(scheduleEvents);
        } catch (err) {
          console.error("Failed to create schedule events:", err);
        }
      }

      await setHasOnboarded(true);
      router.replace("/");
    } catch (err) {
      console.error("Onboarding error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinue = () => {
    switch (step) {
      case "name": return name.trim().length > 0;
      case "type": return userType !== "";
      case "student_details": return true;
      case "work_details": return true;
      case "schedule": return true;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case "name":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.greeting, { color: theme.tint }]}>Welcome to Waqt</Text>
            <Text style={[styles.question, { color: theme.text }]}>What's your name?</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              placeholder="Your name"
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
        );

      case "type":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.question, { color: theme.text }]}>Hey {name}!</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Are you a student or working?
            </Text>
            <View style={styles.optionsRow}>
              <Pressable
                style={[
                  styles.optionCard,
                  { backgroundColor: theme.card, borderColor: userType === "student" ? theme.tint : theme.cardBorder },
                  userType === "student" && { borderWidth: 2 },
                ]}
                onPress={() => { setUserType("student"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Feather name="book-open" size={28} color={userType === "student" ? theme.tint : theme.textSecondary} />
                <Text style={[styles.optionText, { color: userType === "student" ? theme.tint : theme.text }]}>Student</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.optionCard,
                  { backgroundColor: theme.card, borderColor: userType === "working" ? theme.tint : theme.cardBorder },
                  userType === "working" && { borderWidth: 2 },
                ]}
                onPress={() => { setUserType("working"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Feather name="briefcase" size={28} color={userType === "working" ? theme.tint : theme.textSecondary} />
                <Text style={[styles.optionText, { color: userType === "working" ? theme.tint : theme.text }]}>Working</Text>
              </Pressable>
            </View>
          </View>
        );

      case "student_details":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.question, { color: theme.text }]}>School hours</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              When do you typically go to school?
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              placeholder="e.g. 8am to 3pm, Mon-Fri"
              placeholderTextColor={theme.textTertiary}
              value={schoolHours}
              onChangeText={setSchoolHours}
              autoFocus
            />
          </View>
        );

      case "work_details":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.question, { color: theme.text }]}>Work setup</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              How do you work?
            </Text>
            <View style={styles.workOptions}>
              {(["remote", "in-person", "hybrid"] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.workOptionPill,
                    { backgroundColor: workType === type ? theme.tint : theme.card, borderColor: workType === type ? theme.tint : theme.cardBorder },
                  ]}
                  onPress={() => { setWorkType(type); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.workOptionText, { color: workType === type ? "#fff" : theme.text }]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, marginTop: 16 }]}
              placeholder="How many hours per week?"
              placeholderTextColor={theme.textTertiary}
              value={workHours}
              onChangeText={setWorkHours}
            />
          </View>
        );

      case "schedule":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.question, { color: theme.text }]}>Anything else?</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Tell us about your typical week so we can help organize your calendar better.
            </Text>
            <TextInput
              style={[styles.inputLarge, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              placeholder="e.g. I have gym on Mon/Wed/Fri, tutoring on Tuesdays..."
              placeholderTextColor={theme.textTertiary}
              value={scheduleDetails}
              onChangeText={setScheduleDetails}
              multiline
              textAlignVertical="top"
            />
          </View>
        );

      default:
        return null;
    }
  };

  const stepIndex = ["name", "type", "student_details", "work_details", "schedule"].indexOf(step);
  const totalSteps = userType === "student" ? 4 : 4;
  const adjustedIndex = step === "work_details" ? 2 : step === "schedule" ? 3 : stepIndex;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 40,
        paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 20,
        paddingHorizontal: 24,
        flexGrow: 1,
      }}
      bottomOffset={20}
    >
      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i <= adjustedIndex ? theme.tint : theme.border },
            ]}
          />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {renderStep()}
      </Animated.View>

      <View style={styles.bottomArea}>
        <Pressable
          style={[
            styles.nextButton,
            { backgroundColor: canContinue() ? theme.tint : theme.border },
          ]}
          onPress={handleNext}
          disabled={!canContinue() || isSubmitting}
        >
          <Text style={[styles.nextButtonText, { color: canContinue() ? "#fff" : theme.textTertiary }]}>
            {step === "schedule" ? (isSubmitting ? "Setting up..." : "Get Started") : "Continue"}
          </Text>
          {step !== "schedule" && <Feather name="arrow-right" size={18} color={canContinue() ? "#fff" : theme.textTertiary} />}
        </Pressable>
        {step === "student_details" || step === "work_details" || step === "schedule" ? (
          <Pressable onPress={handleNext} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: theme.textTertiary }]}>
              {step === "schedule" ? "" : "Skip"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 40,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  stepContent: {
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  question: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  inputLarge: {
    height: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  optionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  optionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  workOptions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  workOptionPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  workOptionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bottomArea: {
    gap: 12,
    marginTop: 24,
  },
  nextButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
