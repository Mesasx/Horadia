"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { haptic } from "@/lib/haptics";
import { syncPushReminders } from "@/lib/push-client";
import {
  notificationOffsetLabel,
  NOTIFICATION_OFFSETS,
  type NotificationOffset,
} from "@/lib/reminder";
import { usePlannerStore } from "@/store/planner-store";

export function NewReminderSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [offset, setOffset] = useState<NotificationOffset>(null);
  const canNotify = Boolean(date && time);
  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const reminder = usePlannerStore.getState().addReminder({
      title,
      date: date || null,
      time: time || null,
      notificationOffset: canNotify ? offset : null,
    });
    haptic("drop");
    void syncPushReminders([reminder]);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo recordatorio">
      <div className="flex flex-col gap-4 py-2">
        <Field label="Título">
          <input
            autoFocus
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Comprar champú"
            className="min-h-12 w-full rounded-[12px] px-3 text-[16px] outline-none"
            style={fieldStyle}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha · opcional">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-12 w-full rounded-[12px] px-3 text-[15px] outline-none"
              style={fieldStyle}
            />
          </Field>
          <Field label="Hora · opcional">
            <input
              type="time"
              step={900}
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="min-h-12 w-full rounded-[12px] px-3 text-[15px] outline-none"
              style={fieldStyle}
            />
          </Field>
        </div>

        <Field label="Aviso · opcional">
          <select
            value={canNotify && offset !== null ? String(offset) : "none"}
            disabled={!canNotify}
            onChange={(event) =>
              setOffset(
                event.target.value === "none"
                  ? null
                  : (Number(event.target.value) as NotificationOffset),
              )
            }
            className="min-h-12 w-full rounded-[12px] px-3 text-[15px] outline-none disabled:opacity-45"
            style={fieldStyle}
          >
            {NOTIFICATION_OFFSETS.map((value) => (
              <option key={value ?? "none"} value={value ?? "none"}>
                {notificationOffsetLabel(value)}
              </option>
            ))}
          </select>
          {!canNotify ? (
            <span
              className="mt-1 block text-[11px] font-normal"
              style={{ color: "var(--text-tertiary)" }}
            >
              Añade fecha y hora para programar una notificación.
            </span>
          ) : null}
        </Field>

        <button
          type="button"
          disabled={!canSave}
          onClick={save}
          className="min-h-12 w-full rounded-[14px] text-[16px] font-semibold disabled:opacity-35"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Guardar
        </button>
      </div>
    </Sheet>
  );
}

const fieldStyle = {
  background: "var(--surface-raised)",
  border: "1px solid var(--hairline)",
  color: "var(--text)",
} as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[13px] font-semibold">
      <span
        className="mb-1.5 block"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
