import Constants from "expo-constants";

let Notifications = null;

// Phone (push) notifications are turned off for the whole app. With this set
// to false the app never asks for notification permission, never creates a
// push token and never shows system notifications. In-app notifications
// (list, badge, sound, vibration) are not affected. Set to true to re-enable.
export const PUSH_NOTIFICATIONS_ENABLED = false;

// Remote (push) notifications are NOT available in Expo Go on Android from
// Expo SDK 53 onwards. Detect Expo Go and fall back to a no-op shim so the app
// still runs there — but never hand back a fake token, because callers save
// whatever they get to the backend.
// `executionEnvironment === "storeClient"` is the supported check;
// `appOwnership` is deprecated and can be null in newer SDKs.
export const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo";

if (PUSH_NOTIFICATIONS_ENABLED && !isExpoGo) {
  try {
    Notifications = require("expo-notifications");
  } catch (e) {
    console.warn("Failed to load expo-notifications:", e);
  }
}

const isMock = !Notifications;

// NOTE: the notification handler is configured once, in
// src/utils/PushNotificationService.js. Do not set another one here —
// setNotificationHandler is global and the last call wins, so a second
// handler silently overrides the first.

export const setNotificationHandler = (handler) => {
  if (isMock) return;
  return Notifications.setNotificationHandler(handler);
};

export const getPermissionsAsync = async () => {
  if (isMock) return { status: "denied" };
  return Notifications.getPermissionsAsync();
};

export const requestPermissionsAsync = async () => {
  if (isMock) return { status: "denied" };
  return Notifications.requestPermissionsAsync();
};

export const getExpoPushTokenAsync = async (options) => {
  // Returning null (instead of a mock string) stops Expo Go runs from
  // overwriting a real device token on the server with garbage.
  if (isMock) return { data: null };
  return Notifications.getExpoPushTokenAsync(options);
};

export const getDevicePushTokenAsync = async () => {
  if (isMock) return { data: null };
  return Notifications.getDevicePushTokenAsync();
};

export const setNotificationChannelAsync = async (id, config) => {
  if (isMock) return;
  return Notifications.setNotificationChannelAsync(id, config);
};

export const addNotificationReceivedListener = (listener) => {
  if (isMock) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(listener);
};

export const addNotificationResponseReceivedListener = (listener) => {
  if (isMock) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(listener);
};

export const getLastNotificationResponseAsync = async () => {
  if (isMock) return null;
  return Notifications.getLastNotificationResponseAsync();
};

export const AndroidImportance = isMock
  ? { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 }
  : Notifications?.AndroidImportance;

export default {
  PUSH_NOTIFICATIONS_ENABLED,
  isExpoGo,
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  getExpoPushTokenAsync,
  getDevicePushTokenAsync,
  setNotificationChannelAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  AndroidImportance,
};
