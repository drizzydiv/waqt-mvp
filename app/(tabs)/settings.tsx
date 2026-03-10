import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet, useColorScheme, Platform, Switch, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ScrollView } from "react-native";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, resetProfile } = useApp();

  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notificationsEnabled ?? true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (profile) {
      await updateProfile({ notificationsEnabled: value });
    }
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      "Reset Profile",
      "This will delete your profile and all your events. You can set up a new profile afterwards.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetProfile();
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

  const getTypeLabel = () => {
    if (!profile) return "";
    if (profile.type === "student") return "Student";
    if (profile.type === "working") return "Working Professional";
    return profile.type;
  };

  const getScheduleInfo = () => {
    if (!profile) return null;
    const parts: string[] = [];
    if (profile.type === "student" && profile.schoolHours) {
      parts.push(`School: ${profile.schoolHours}`);
    }
    if (profile.type === "working") {
      if (profile.workType) parts.push(`${profile.workType.charAt(0).toUpperCase() + profile.workType.slice(1)}`);
      if (profile.workHours) parts.push(`${profile.workHours}`);
    }
    if (profile.scheduleDetails) parts.push(profile.scheduleDetails);
    return parts.length > 0 ? parts.join(" | ") : null;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: theme.text }]}>Settings</Text>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Feather name="user" size={18} color={theme.tint} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile</Text>
        </View>
        {profile ? (
          <View style={styles.profileInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.tintLight }]}>
              <Text style={[styles.avatarText, { color: theme.tint }]}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
              <Text style={[styles.profileType, { color: theme.textSecondary }]}>{getTypeLabel()}</Text>
              {getScheduleInfo() ? (
                <Text style={[styles.profileSchedule, { color: theme.textTertiary }]} numberOfLines={2}>
                  {getScheduleInfo()}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <Text style={[styles.noProfile, { color: theme.textTertiary }]}>No profile set up</Text>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Feather name="bell" size={18} color={theme.tint} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Event Reminders</Text>
            <Text style={[styles.settingDesc, { color: theme.textTertiary }]}>
              Get notified before your events
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: theme.border, true: theme.tint + "80" }}
            thumbColor={notificationsEnabled ? theme.tint : theme.textTertiary}
          />
        </View>
      </View>

      {Platform.OS === "web" && !isInstalled && installPrompt ? (
        <Pressable
          style={[styles.installBanner, { backgroundColor: theme.tint + "15", borderColor: theme.tint + "40" }]}
          onPress={handleInstall}
        >
          <Feather name="download" size={20} color={theme.tint} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.installTitle, { color: theme.text }]}>Install Waqt</Text>
            <Text style={[styles.installDesc, { color: theme.textSecondary }]}>
              Add to your home screen for a native app experience
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={theme.textTertiary} />
        </Pressable>
      ) : null}

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Feather name="info" size={18} color={theme.tint} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Version</Text>
          <Text style={[styles.settingValue, { color: theme.textTertiary }]}>1.0.0</Text>
        </View>
        <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Powered by</Text>
          <Text style={[styles.settingValue, { color: theme.textTertiary }]}>OpenAI</Text>
        </View>
      </View>

      <Pressable
        style={[styles.dangerButton, { borderColor: theme.destructive + "40" }]}
        onPress={handleResetOnboarding}
      >
        <Feather name="refresh-cw" size={16} color={theme.destructive} />
        <Text style={[styles.dangerButtonText, { color: theme.destructive }]}>Reset Profile</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  profileInfo: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  profileName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  profileType: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  profileSchedule: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
    lineHeight: 16,
  },
  noProfile: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  settingDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  settingDivider: {
    height: 1,
    marginVertical: 10,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  installBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  installTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  installDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
