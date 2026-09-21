"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { ALL_SUBJECTS } from "@/lib/planner";
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
  const [kind, setKind] = useState<"reminder" | "delivery">("reminder");
  const [subjectCode, setSubjectCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [offset, setOffset] = useState<NotificationOffset>(null);
  const canNotify = Boolean(date && time);
  const canSave = title.trim().length > 0 && (kind !== "delivery" || Boolean(subjectCode && date));

  const save = async () => {
    if (saved) { onClose(); return; }
    if (!canSave || saving) return;
    setSaving(true);
    const reminder = usePlannerStore.getState().addReminder({
      title,
      kind,
      subjectCode: kind === "delivery" ? subjectCode : null,
      date: date || null,
      time: time || null,
      notificationOffset: canNotify ? offset : null,
    });
    haptic("drop");
    setSaved(true);
    try {
      const synced = await syncPushReminders([reminder]);
      if (reminder.notificationOffset !== null && !synced) {
        setNotice("Guardado. El aviso aún no está programado: activa las notificaciones en Ajustes y comprueba tu conexión.");
      } else onClose();
    } catch {
      setNotice("Guardado en este dispositivo. No se pudo sincronizar el aviso; comprueba tu conexión y las notificaciones en Ajustes.");
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo recordatorio">
      <div className="flex flex-col gap-4 py-2">
        <fieldset disabled={saved || saving} className="flex flex-col gap-4 disabled:opacity-60">
        <Field label="Tipo">
          <select value={kind} onChange={(event) => setKind(event.target.value as "reminder" | "delivery")}
            className="min-h-12 w-full rounded-[12px] px-3 text-[16px]" style={fieldStyle}>
            <option value="reminder">Recordatorio</option>
            <option value="delivery">Entrega de una asignatura</option>
          </select>
        </Field>
        {kind === "delivery" ? <Field label="Asignatura">
          <select value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)}
            className="min-h-12 w-full rounded-[12px] px-3 text-[15px]" style={fieldStyle}>
            <option value="">Selecciona una asignatura</option>
            {ALL_SUBJECTS.map((subject) => <option key={subject.code} value={subject.code}>{subject.fullName}</option>)}
          </select>
        </Field> : null}
        <Field label="Título">
          <input
            autoFocus
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={kind === "delivery" ? "Informe de prácticas" : "Comprar champú"}
            className="min-h-12 w-full rounded-[12px] px-3 text-[16px] outline-none"
            style={fieldStyle}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "delivery" ? "Fecha límite" : "Fecha · opcional"}>
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

        </fieldset>
        {notice ? <p role="status" className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{notice}</p> : null}
        <button
          type="button"
          disabled={(!canSave && !saved) || saving}
          onClick={save}
          className="min-h-12 w-full rounded-[14px] text-[16px] font-semibold disabled:opacity-35"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {saving ? "Guardando…" : saved ? "Listo" : kind === "delivery" ? "Guardar entrega" : "Guardar"}
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
