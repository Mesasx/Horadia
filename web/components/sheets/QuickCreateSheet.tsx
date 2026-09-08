"use client";

/**
 * Tapping a "Libre" block opens this (§7): the built-in library as quick chips
 * plus "Crear actividad". The new block fills the tapped gap (clamped to the
 * template's default duration).
 */

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { usePlannerStore } from "@/store/planner-store";
import { NewActivitySheet } from "./NewActivitySheet";
import { paletteVars } from "@/lib/palette";
import { iconFor } from "@/lib/icons";
import { haptic } from "@/lib/haptics";
import { TimeGrid } from "@/lib/time";
import { makeItemFromLibrary, type LibraryActivity } from "@/lib/seed";
import type { TimeSlot } from "@/lib/timeslot";
import { Plus } from "lucide-react";

export function QuickCreateSheet({
  open,
  slot,
  onClose,
}: {
  open: boolean;
  slot: { slot: TimeSlot; day: Date } | null;
  onClose: () => void;
}) {
  const library = usePlannerStore((s) => s.library);
  const add = usePlannerStore((s) => s.add);
  const addLibraryActivity = usePlannerStore((s) => s.addLibraryActivity);
  const [showNew, setShowNew] = useState(false);

  if (!slot) return null;

  const create = (template: LibraryActivity) => {
    const start = TimeGrid.snap(new Date(slot.slot.start));
    const available = slot.slot.end - start.getTime();
    const duration = Math.max(
      TimeGrid.minimumActivityDuration,
      Math.min(template.defaultDuration, available),
    );
    add(makeItemFromLibrary(template, start, duration));
    haptic("drop");
    onClose();
  };

  return (
    <>
      <Sheet open={open && !showNew} onClose={onClose} title="Nueva actividad">
        <div className="grid grid-cols-2 gap-2.5">
          {library.map((template) => {
            const c = paletteVars(template.palette);
            const Icon = iconFor(template.symbolName);
            return (
              <button
                key={template.id}
                onClick={() => create(template)}
                className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3.5 text-left"
                style={{ background: c.fill, border: `1px solid ${c.border}`, color: c.accent }}
              >
                <Icon size={18} strokeWidth={2.2} />
                <span className="no-truncate text-[15px] font-semibold">{template.name}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowNew(true)}
            className="col-span-2 flex items-center justify-center gap-2 rounded-[14px] px-3.5 py-3.5 text-[15px] font-semibold"
            style={{ background: "var(--surface-sunken)" }}
          >
            <Plus size={17} strokeWidth={2.6} />
            Crear actividad
          </button>
        </div>
      </Sheet>

      <NewActivitySheet
        open={open && showNew}
        onClose={() => setShowNew(false)}
        onCreate={({ name, palette, symbolName }) => {
          const created = addLibraryActivity({ name, kind: "custom", palette, symbolName });
          setShowNew(false);
          create(created);
        }}
      />
    </>
  );
}
