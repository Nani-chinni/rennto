import * as Notifications from "./NotificationsProxy";
import Constants from "expo-constants";
import { Platform } from "react-native";

// The single global notification handler for the whole app.
// Keep this the ONLY setNotificationHandler call in the codebase —
// it is global state and the last caller wins.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const ANDROID_CHANNEL_ID = "default";

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6C63FF",
  });
}

export async function registerForPushNotificationsAsync() {
  try {
    if (Notifications.isExpoGo) {
      // Expo SDK 53+ removed remote push from Expo Go on Android.
      console.warn(
        "[push] Running in Expo Go — remote push notifications are not supported. Use a development build (npx expo run:android)."
      );
      return null;
    }

    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[push] Notification permission denied");
      return null;
    }

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn("[push] Missing EAS projectId in app.json extra.eas.projectId");
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.warn("[push] EXPO PUSH TOKEN:", token);
    return token || null;
  } catch (error) {
    console.warn("[push] PUSH TOKEN ERROR:", error);
    return null;
  }
}
