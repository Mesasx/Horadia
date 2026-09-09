import { describe, expect, it } from "vitest";
import {
  createReminder,
  reminderNotificationTime,
  remindersForWeek,
  type Reminder,
} from "@/lib/reminder";
import { d } from "./support";

function reminder(
  id: string,
  date: string | null,
  time: string | null,
  completed = false,
): Reminder {
  return {
    id,
    title: id,
    date,
    time,
    completed,
    createdAt: 1,
    notificationOffset: date && time ? 15 : null,
  };
}

describe("recordatorios", () => {
  it("creates the requested minimal model and removes an unusable alert", () => {
    const created = createReminder(
      {
        title: "  Comprar champú  ",
        date: null,
        time: "19:00",
        notificationOffset: 15,
      },
      123,
    );
    expect(created.title).toBe("Comprar champú");
    expect(created.completed).toBe(false);
    expect(created.createdAt).toBe(123);
    expect(created.notificationOffset).toBeNull();
  });

  it("computes the real delivery time from date, time and offset", () => {
    const value = reminder("Llamar", "2026-09-08", "19:00");
    expect(reminderNotificationTime(value)).toBe(
      d(2026, 9, 8, 18, 45).getTime(),
    );
    expect(
      reminderNotificationTime({ ...value, completed: true }),
    ).toBeNull();
  });

  it("shows this week's reminders, then undated and completed items", () => {
    const values = [
      reminder("sin-fecha", null, null),
      reminder("martes-tarde", "2026-09-08", "19:00"),
      reminder("fuera", "2026-09-20", "10:00"),
      reminder("lunes", "2026-09-07", "09:00"),
      reminder("completado", "2026-09-07", "08:00", true),
    ];
    expect(remindersForWeek(values, d(2026, 9, 9)).map((item) => item.id)).toEqual([
      "lunes",
      "martes-tarde",
      "sin-fecha",
      "completado",
    ]);
  });
});
