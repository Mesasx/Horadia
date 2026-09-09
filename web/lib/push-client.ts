import type { Reminder } from "./reminder";
import { reminderNotificationTime } from "./reminder";

const SUBSCRIPTION_ID_KEY = "horadia.push.subscription-id";

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  needsHomeScreenInstall: boolean;
}

function supportsPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosNavigator.standalone === true
  );
}

export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined") {
    return {
      supported: false,
      permission: "unsupported",
      subscribed: false,
      needsHomeScreenInstall: false,
    };
  }
  const needsHomeScreenInstall = isIos() && !isStandalone();
  if (!supportsPush()) {
    return {
      supported: false,
      permission: "unsupported",
      subscribed: false,
      needsHomeScreenInstall,
    };
  }
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(subscription),
    needsHomeScreenInstall,
  };
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  return new Uint8Array(bytes.buffer);
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "No se pudo completar la operación.");
  }
  return data;
}

async function saveSubscription(
  subscription: PushSubscription,
): Promise<string> {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  const { subscriptionId } = await responseJson<{ subscriptionId: string }>(
    response,
  );
  localStorage.setItem(SUBSCRIPTION_ID_KEY, subscriptionId);
  return subscriptionId;
}

export async function enablePushNotifications(
  reminders: Reminder[],
): Promise<PushStatus> {
  if (!supportsPush()) {
    throw new Error(
      isIos() && !isStandalone()
        ? "Añade Horadia a la pantalla de inicio para activar notificaciones."
        : "Este dispositivo no admite notificaciones Web Push.",
    );
  }
  if (isIos() && !isStandalone()) {
    throw new Error(
      "En iPhone, abre Horadia desde el icono de la pantalla de inicio.",
    );
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("No se ha concedido permiso para las notificaciones.");
  }

  await navigator.serviceWorker.register("/sw.js");
  const registration = await navigator.serviceWorker.ready;
  const configResponse = await fetch("/api/push/config", { cache: "no-store" });
  const { publicKey } = await responseJson<{ publicKey: string }>(configResponse);
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(publicKey),
    }));
  const subscriptionId = await saveSubscription(subscription);
  await syncPushReminders(reminders, true, subscriptionId);
  return getPushStatus();
}

export async function refreshPushRegistration(
  registration: ServiceWorkerRegistration,
  reminders: Reminder[],
): Promise<void> {
  if (!supportsPush() || Notification.permission !== "granted") return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const subscriptionId = await saveSubscription(subscription);
  await syncPushReminders(reminders, true, subscriptionId);
}

export async function syncPushReminders(
  reminders: Reminder[],
  replace = false,
  explicitSubscriptionId?: string,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const subscriptionId =
    explicitSubscriptionId ?? localStorage.getItem(SUBSCRIPTION_ID_KEY);
  if (!subscriptionId) return false;
  const response = await fetch("/api/push/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscriptionId,
      replace,
      reminders: reminders.map((reminder) => ({
        ...reminder,
        notifyAt: reminderNotificationTime(reminder),
      })),
    }),
    keepalive: true,
  });
  if (!response.ok) {
    if (response.status === 404) {
      localStorage.removeItem(SUBSCRIPTION_ID_KEY);
    }
    return false;
  }
  return true;
}

export async function sendTestPush(): Promise<void> {
  const subscriptionId = localStorage.getItem(SUBSCRIPTION_ID_KEY);
  if (!subscriptionId) {
    throw new Error("Activa primero las notificaciones.");
  }
  const response = await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  await responseJson(response);
}
