import { Alert } from "react-native";

/**
 * Global alert guard: only ONE native alert popup can be on screen at a time.
 *
 * Installed once from App.js. It wraps Alert.alert (and the global alert())
 * so every existing call in the app goes through it without changing call sites.
 *
 * Rules:
 * - While a popup is visible, any new popup is ignored (the first one wins).
 * - The same title + message is not shown again within a short window after it
 *   closes (double taps, repeated API responses, polling, listeners).
 * - Critical popups (options.cancelable === false, e.g. "Account Suspended")
 *   are never lost: they wait and show right after the current popup closes.
 * - A popup opened from another popup's button (confirm -> result) still shows,
 *   because the visible flag is released before that button's handler runs.
 */

const DUPLICATE_WINDOW_MS = 2000;
// Safety net so the guard can never block alerts forever if a native
// dismiss callback is missed.
const STUCK_RELEASE_MS = 60000;

let installed = false;
let nativeAlert = null;
let visibleKey = null;
let stuckTimer = null;
// key -> time the popup closed, for the duplicate window
const recentlyClosed = new Map();
const criticalQueue = [];

const makeKey = (title, message) => `${title ?? ""}|${message ?? ""}`;

function release() {
  if (stuckTimer) {
    clearTimeout(stuckTimer);
    stuckTimer = null;
  }
  if (visibleKey !== null) {
    recentlyClosed.set(visibleKey, Date.now());
  }
  visibleKey = null;
}

function showNext() {
  if (visibleKey !== null || criticalQueue.length === 0) return;
  const next = criticalQueue.shift();
  present(...next);
}

function present(title, message, buttons, options) {
  const key = makeKey(title, message);
  visibleKey = key;
  stuckTimer = setTimeout(() => {
    release();
    showNext();
  }, STUCK_RELEASE_MS);

  const baseButtons =
    Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: "OK" }];

  const wrappedButtons = baseButtons.map((btn) => ({
    ...btn,
    onPress: (...args) => {
      release();
      try {
        if (typeof btn?.onPress === "function") btn.onPress(...args);
      } finally {
        // Let a popup opened by this button go first, then any queued critical one.
        setTimeout(showNext, 0);
      }
    },
  }));

  const wrappedOptions = {
    ...(options || {}),
    onDismiss: (...args) => {
      release();
      try {
        if (typeof options?.onDismiss === "function") options.onDismiss(...args);
      } finally {
        setTimeout(showNext, 0);
      }
    },
  };

  nativeAlert(title, message, wrappedButtons, wrappedOptions);
}

function guardedAlert(title, message, buttons, options) {
  const key = makeKey(title, message);
  const isCritical = options?.cancelable === false;

  if (visibleKey !== null) {
    // Same popup already on screen, or another popup is open.
    if (isCritical && key !== visibleKey && !criticalQueue.some((q) => makeKey(q[0], q[1]) === key)) {
      criticalQueue.push([title, message, buttons, options]);
    }
    return;
  }

  const now = Date.now();
  for (const [k, at] of recentlyClosed) {
    if (now - at >= DUPLICATE_WINDOW_MS) recentlyClosed.delete(k);
  }
  if (recentlyClosed.has(key)) {
    return;
  }

  present(title, message, buttons, options);
}

export function installAlertGuard() {
  if (installed) return;
  installed = true;
  nativeAlert = Alert.alert.bind(Alert);
  Alert.alert = guardedAlert;
  // Bare alert("...") calls also go through the guard.
  global.alert = (text) => guardedAlert("Alert", String(text));
}

/** Kept for existing imports: same behaviour as Alert.alert once the guard is installed. */
export function showOnceAlert(title, message, buttons, options) {
  installAlertGuard();
  Alert.alert(title, message, buttons, options);
}

installAlertGuard();
