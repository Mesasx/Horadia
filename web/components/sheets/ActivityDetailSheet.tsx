"use client";

/**
 * Tap an activity → this sheet (§18): Marcar realizada · Fijar/Desbloquear ·
 * Duplicar · Copiar al día siguiente · Copiar a otro día… · Mover a otro día… ·
 * Eliminar. University classes get the §14 treatment instead: info + "No asistir
 * este día" / "Volver a asistir".
 */

import { useState } from "react";
import { Sheet, SheetGroup, SheetRow } from "@/components/Sheet";
import { DayPickerSheet } from "./DayPickerSheet";
import { usePlannerStore } from "@/store/planner-store";
import { isOmitted } from "@/lib/planner";
import { paletteVars } from "@/lib/palette";
import { iconFor } from "@/lib/icons";
import { formatRange, formatWeekdayLong, formatDuration } from "@/lib/format";
import {
  addDays,
  parseTimeOfDay,
  settingTime,
  startOfDay,
  TimeGrid,
} from "@/lib/time";
import { haptic } from "@/lib/haptics";
import {
  accessibilityCategory,
  isPersonal,
  type ScheduledItem,
} from "@/lib/scheduled-item";
import {
  Check,
  Copy,
  CalendarPlus,
  CalendarClock,
  Clock3,
  Lock,
  LockOpen,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";

export function ActivityDetailSheet({
  selected,
  onClose,
}: {
  selected: ScheduledItem | null;
  onClose: () => void;
}) {
  const state = usePlannerStore();
  const store = usePlannerStore.getState();
  const [copyPicker, setCopyPicker] = useState(false);
  const [movePicker, setMovePicker] = useState(false);
  const [timeEditor, setTimeEditor] = useState(false);

  // Personal items are re-read live so the sheet reflects edits; classes are
  // shown from the snapshot the caller passed (they are not in personalItems).
  const item =
    state.personalItems.find((i) => i.id === selected?.id) ?? selected ?? null;
  if (!selected || !item) return null;

  const c = paletteVars(item.palette);
  const Icon = iconFor(item.symbolName);
  const day = new Date(item.start);
  const personal = isPersonal(item);
  const omitted = item.instanceKey ? isOmitted(state, item.instanceKey) : false;

  return (
    <>
      <Sheet open={!copyPicker && !movePicker && !timeEditor} onClose={onClose}>
        <div
          className="mb-2 flex items-center gap-3 rounded-[14px] px-4 py-3"
          style={{ background: c.fill, color: c.accent }}
        >
          <Icon size={22} strokeWidth={2.2} />
          <div className="min-w-0">
            {item.badge ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                {item.badge}
              </p>
            ) : null}
            <p className="text-[17px] font-bold no-truncate">{item.fullTitle ?? item.title}</p>
            {!personal && item.fullTitle ? (
              <p className="text-[12px] font-semibold opacity-75">{item.subjectCode ?? item.title}</p>
            ) : null}
            <p className="text-[13px] tabular-nums opacity-80 capitalize">
              {formatWeekdayLong(day)} · {formatRange(item.start, item.end)} · {formatDuration(item.end - item.start)}
            </p>
          </div>
        </div>

        {personal ? (
          <>
            <SheetGroup>
              <SheetRow
                icon={<Check size={18} />}
                label={item.isCompleted ? "Quitar «realizada»" : "Marcar realizada"}
                onClick={() => {
                  store.toggleDone(item.id);
                  haptic("complete");
                }}
              />
              <SheetRow
                icon={item.isPinned ? <LockOpen size={18} /> : <Lock size={18} />}
                label={item.isPinned ? "Desbloquear" : "Fijar"}
                onClick={() => store.togglePin(item.id)}
              />
              <SheetRow
                icon={<Clock3 size={18} />}
                label="Cambiar hora"
                detail={formatRange(item.start, item.end)}
                disabled={item.isPinned}
                onClick={() => setTimeEditor(true)}
              />
              <SheetRow
                icon={<Minus size={18} />}
                label="Acortar 15 min"
                disabled={item.isPinned || item.end - item.start <= TimeGrid.minimumActivityDuration}
                onClick={() => store.resize(item.id, item.end - TimeGrid.step)}
              />
              <SheetRow
                icon={<Plus size={18} />}
                label="Alargar 15 min"
                disabled={item.isPinned}
                onClick={() => store.resize(item.id, item.end + TimeGrid.step)}
              />
            </SheetGroup>

            <SheetGroup>
              <SheetRow
                icon={<Copy size={18} />}
                label="Duplicar"
                onClick={() => {
                  store.duplicate(item.id);
                  onClose();
                }}
              />
              <SheetRow
                icon={<CalendarPlus size={18} />}
                label="Copiar al día siguiente"
                onClick={() => {
                  store.copyToDay(item.id, addDays(startOfDay(day), 1));
                  onClose();
                }}
              />
              <SheetRow
                icon={<CalendarPlus size={18} />}
                label="Copiar a otro día…"
                onClick={() => setCopyPicker(true)}
              />
              {!item.isPinned ? (
                <SheetRow
                  icon={<CalendarClock size={18} />}
                  label="Mover a otro día…"
                  onClick={() => setMovePicker(true)}
                />
              ) : null}
            </SheetGroup>

            <SheetGroup>
              <SheetRow
                icon={<Trash2 size={18} />}
                label="Eliminar"
                destructive
                onClick={() => {
                  store.remove(item.id);
                  haptic("delete");
                  onClose();
                }}
              />
            </SheetGroup>
          </>
        ) : (
          <>
            <SheetGroup>
              <DetailRow label="Abreviatura" detail={item.subjectCode ?? item.title} />
              <DetailRow label="Tipo" detail={accessibilityCategory(item.kind)} />
              <DetailRow label="Hora" detail={formatRange(item.start, item.end)} />
              {item.location ? <DetailRow label="Ubicación" detail={item.location} /> : null}
            </SheetGroup>
            <p className="px-3 py-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              El horario de la universidad es fijo. Puedes quitar esta clase solo
              de este día; el horario oficial no cambia y es reversible.
            </p>
            <SheetGroup>
              {omitted ? (
                <SheetRow
                  icon={<Check size={18} />}
                  label="Volver a asistir"
                  onClick={() => {
                    if (item.instanceKey) store.restore(item.instanceKey);
                    onClose();
                  }}
                />
              ) : (
                <SheetRow
                  icon={<Trash2 size={18} />}
                  label="No asistir este día"
                  destructive
                  onClick={() => {
                    if (item.instanceKey) store.omit(item.instanceKey);
                    haptic("delete");
                    onClose();
                  }}
                />
              )}
            </SheetGroup>
          </>
        )}
      </Sheet>

      <DayPickerSheet
        open={copyPicker}
        anchor={day}
        title="Copiar a…"
        onClose={() => setCopyPicker(false)}
        onPick={(picked) => {
          store.copyToDay(item.id, picked);
          setCopyPicker(false);
          onClose();
        }}
      />
      <DayPickerSheet
        open={movePicker}
        anchor={day}
        title="Mover a…"
        onClose={() => setMovePicker(false)}
        onPick={(picked) => {
          store.moveToDay(item.id, picked);
          setMovePicker(false);
          onClose();
        }}
      />
      {timeEditor ? (
        <TimeEditorSheet
          key={item.id}
          open
          item={item}
          onClose={() => setTimeEditor(false)}
          onSave={(start, end) => {
            store.reschedule(item.id, start, end);
            haptic("drop");
            setTimeEditor(false);
          }}
        />
      ) : null}
    </>
  );
}

function inputTime(date: number): string {
  const value = new Date(date);
  return `${String(value.getHours()).padStart(2, "0")}:${String(
    value.getMinutes(),
  ).padStart(2, "0")}`;
}

function TimeEditorSheet({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  item: ScheduledItem;
  onClose: () => void;
  onSave: (start: number, end: number) => void;
}) {
  const [startValue, setStartValue] = useState(() => inputTime(item.start));
  const [endValue, setEndValue] = useState(() => inputTime(item.end));
  const startTime = parseTimeOfDay(startValue);
  const endTime = parseTimeOfDay(endValue);
  const day = new Date(item.start);
  const start = startTime ? settingTime(day, startTime).getTime() : null;
  const end = endTime ? settingTime(day, endTime).getTime() : null;
  const valid = start !== null && end !== null && end > start;

  return (
    <Sheet open={open} onClose={onClose} title="Cambiar hora">
      <div className="grid grid-cols-2 gap-3 py-2">
        <TimeField label="Inicio" value={startValue} onChange={setStartValue} />
        <TimeField label="Fin" value={endValue} onChange={setEndValue} />
      </div>
      {!valid ? (
        <p className="px-1 pb-2 text-[13px]" style={{ color: "var(--now)" }}>
          La hora de fin debe ser posterior a la de inicio.
        </p>
      ) : null}
      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          if (start !== null && end !== null) onSave(start, end);
        }}
        className="mt-2 min-h-12 w-full rounded-[14px] px-4 text-[16px] font-semibold disabled:opacity-35"
        style={{ background: "var(--accent)", color: "white" }}
      >
        Guardar hora
      </button>
    </Sheet>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <input
        type="time"
        step={900}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-[12px] px-3 text-[17px] tabular-nums"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--hairline)",
          color: "var(--text)",
        }}
      />
    </label>
  );
}

function DetailRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex min-h-11 items-center gap-3 px-4 py-3 text-[15px]">
      <span className="flex-1">{label}</span>
      <span className="text-right" style={{ color: "var(--text-secondary)" }}>
        {detail}
      </span>
    </div>
  );
}
