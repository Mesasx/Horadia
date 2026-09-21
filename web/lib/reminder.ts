import { newId } from "./seed";
import {
  addDays,
  MINUTE,
  parseDayKey,
  parseTimeOfDay,
  settingTime,
  startOfWeek,
  endOfDayMidnight,
} from "./time";

export const NOTIFICATION_OFFSETS = [null, 0, 15, 30, 60, 1_440] as const;

export type NotificationOffset = (typeof NOTIFICATION_OFFSETS)[number];

export interface Reminder {
  id: string;
  title: string;
  /** Absent on reminders saved before delivery support. */
  kind?: "reminder" | "delivery";
  subjectCode?: string | null;
  /** Local calendar date in yyyy-MM-dd, or null when it is undated. */
  date: string | null;
  /** Local wall-clock time in HH:mm, or null when it has no time. */
  time: string | null;
  completed: boolean;
  createdAt: number;
  /** Minutes before the due time. null means no notification. */
  notificationOffset: NotificationOffset;
}

export type NewReminder = Pick<
  Reminder,
  "title" | "date" | "time" | "notificationOffset" | "kind" | "subjectCode"
>;

export function createReminder(input: NewReminder, now = Date.now()): Reminder {
  const title = input.title.trim();
  if (!title) throw new Error("El título es obligatorio.");
  if (input.kind === "delivery" && (!input.subjectCode || !input.date || !parseDayKey(input.date))) {
    throw new Error("La entrega necesita asignatura y fecha límite.");
  }
  return {
    kind: input.kind ?? "reminder",
    subjectCode: input.kind === "delivery" ? input.subjectCode : null,
    id: newId("rem"),
    title,
    date: input.date || null,
    time: input.time || null,
    completed: false,
    createdAt: now,
    notificationOffset:
      input.date && input.time ? input.notificationOffset : null,
  };
}

/** Absolute notification time in the device's local timezone. */
export function reminderNotificationTime(reminder: Reminder): number | null {
  if (
    reminder.completed ||
    reminder.notificationOffset === null ||
    !reminder.date ||
    !reminder.time
  ) {
    return null;
  }
  const day = parseDayKey(reminder.date);
  const time = parseTimeOfDay(reminder.time);
  if (!day || !time) return null;
  return (
    settingTime(day, time).getTime() - reminder.notificationOffset * MINUTE
  );
}

export function remindersForWeek(
  reminders: Reminder[],
  date: Date,
  now = new Date(),
): Reminder[] {
  const from = startOfWeek(date);
  const until = addDays(from, 7);
  return reminders
    .filter((reminder) => {
      if (startOfWeek(date).getTime() === startOfWeek(now).getTime() && isDeliveryOverdue(reminder, now)) return true;
      if (!reminder.date) return true;
      const reminderDate = parseDayKey(reminder.date);
      return Boolean(
        reminderDate && reminderDate >= from && reminderDate < until,
      );
    })
    .sort(compareReminders);
}

function compareReminders(a: Reminder, b: Reminder): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (a.date !== b.date) {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  }
  if (a.time !== b.time) {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  }
  return a.createdAt - b.createdAt;
}

export function notificationOffsetLabel(offset: NotificationOffset): string {
  switch (offset) {
    case null:
      return "Sin aviso";
    case 0:
      return "A la hora";
    case 15:
      return "15 min antes";
    case 30:
      return "30 min antes";
    case 60:
      return "1 h antes";
    case 1_440:
      return "1 día antes";
  }
}


export function isDeliveryOverdue(reminder: Reminder, now = new Date()): boolean {
  if (reminder.kind !== "delivery" || reminder.completed || !reminder.date) return false;
  const day = parseDayKey(reminder.date);
  if (!day) return false;
  const time = reminder.time ? parseTimeOfDay(reminder.time) : null;
  const deadline = time ? settingTime(day, time) : endOfDayMidnight(day);
  return deadline.getTime() <= now.getTime();
}
