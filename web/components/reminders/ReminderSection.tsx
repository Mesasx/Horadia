"use client";

import { useEffect, useMemo } from "react";
import { Bell, Check, Circle, Plus } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { formatWeekdayLong } from "@/lib/format";
import { syncPushReminders } from "@/lib/push-client";
import {
  notificationOffsetLabel,
  remindersForWeek,
  type Reminder,
} from "@/lib/reminder";
import { parseDayKey } from "@/lib/time";
import { usePlannerStore } from "@/store/planner-store";

export function ReminderSection({
  weekStart,
  onAdd,
}: {
  weekStart: Date;
  onAdd: () => void;
}) {
  const reminders = usePlannerStore((state) => state.reminders);
  const toggleReminder = usePlannerStore((state) => state.toggleReminder);
  const visible = useMemo(
    () => remindersForWeek(reminders, weekStart),
    [reminders, weekStart],
  );

  useEffect(() => {
    const linkedId = new URLSearchParams(window.location.search).get("reminder");
    if (!linkedId) return;
    window.setTimeout(() => {
      document
        .getElementById(`reminder-${linkedId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  }, [visible]);

  const toggle = (reminder: Reminder) => {
    const updated = toggleReminder(reminder.id);
    if (!updated) return;
    haptic(updated.completed ? "complete" : "select");
    void syncPushReminders([updated]);
  };

  return (
    <section id="reminders" className="px-4 pb-6 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[19px] font-bold">Recordatorios</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-11 items-center gap-1 rounded-full px-3 text-[14px] font-semibold active:opacity-60"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <Plus size={17} strokeWidth={2.5} />
          Recordatorio
        </button>
      </div>

      <div
        className="overflow-hidden rounded-[var(--r-card)]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          boxShadow: "var(--shadow-resting)",
        }}
      >
        {visible.length === 0 ? (
          <p
            className="px-4 py-5 text-center text-[14px]"
            style={{ color: "var(--text-secondary)" }}
          >
            No hay recordatorios para esta semana.
          </p>
        ) : (
          visible.map((reminder, index) => (
            <div
              id={`reminder-${reminder.id}`}
              key={reminder.id}
              className={`flex items-start gap-3 px-4 py-3 transition-[opacity,background-color] duration-200 ${
                reminder.completed ? "opacity-45" : ""
              }`}
              style={{
                borderTop:
                  index === 0 ? undefined : "1px solid var(--hairline)",
              }}
            >
              <button
                type="button"
                aria-label={
                  reminder.completed
                    ? `Marcar ${reminder.title} como pendiente`
                    : `Completar ${reminder.title}`
                }
                onClick={() => toggle(reminder)}
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full active:scale-90"
                style={{ color: "var(--accent)" }}
              >
                {reminder.completed ? (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                ) : (
                  <Circle size={21} strokeWidth={1.8} />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[15px] font-medium no-truncate ${
                    reminder.completed ? "line-through" : ""
                  }`}
                >
                  {reminder.title}
                </p>
                <ReminderMetadata reminder={reminder} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ReminderMetadata({ reminder }: { reminder: Reminder }) {
  const parts: string[] = [];
  const day = reminder.date ? parseDayKey(reminder.date) : null;
  if (day) {
    const weekday = formatWeekdayLong(day);
    parts.push(weekday.charAt(0).toUpperCase() + weekday.slice(1));
  }
  if (reminder.time) parts.push(reminder.time);
  if (reminder.notificationOffset !== null) {
    parts.push(notificationOffsetLabel(reminder.notificationOffset));
  }
  if (parts.length === 0) return null;
  return (
    <p
      className="mt-0.5 flex items-center gap-1 text-[12px] no-truncate"
      style={{ color: "var(--text-secondary)" }}
    >
      {reminder.notificationOffset !== null ? <Bell size={11} /> : null}
      {parts.join(" · ")}
    </p>
  );
}
