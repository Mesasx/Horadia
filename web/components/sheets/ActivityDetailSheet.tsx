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
import { addDays, startOfDay } from "@/lib/time";
import { haptic } from "@/lib/haptics";
import { isPersonal, type ScheduledItem } from "@/lib/scheduled-item";
import {
  Check,
  Copy,
  CalendarPlus,
  CalendarClock,
  Lock,
  LockOpen,
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
      <Sheet open={!copyPicker && !movePicker} onClose={onClose}>
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
    </>
  );
}
