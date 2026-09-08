"use client";

/**
 * The shared drag-and-drop chrome (§12–15): the finger-following drag overlay,
 * the bottom "Soltar para quitar" zone, the "· Deshacer" banner, the conflict
 * dialog, and the "Finalizar" button for organisation mode (§13).
 */

import { usePlannerInteraction } from "./PlannerInteractionContext";
import { ActivityCard } from "@/components/timeline/ActivityCard";
import { conflictSummary, isMultiple } from "@/lib/conflict";
import { Trash2, Undo2 } from "lucide-react";

export function PlannerChrome() {
  const it = usePlannerInteraction();

  return (
    <>
      {it.drag ? <DragOverlay /> : null}

      {/* bottom zone: delete target while dragging, else "Finalizar" in org mode */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        {it.drag ? (
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition"
            style={{
              background: it.overDelete ? "var(--now)" : "var(--material-regular)",
              color: it.overDelete ? "#fff" : "var(--text)",
              backdropFilter: "blur(12px)",
              border: it.overDelete
                ? "1px solid transparent"
                : "1px dashed var(--now)",
              boxShadow: "var(--shadow-raised)",
            }}
          >
            <Trash2 size={15} strokeWidth={2.4} />
            {it.drag.item.kind.type === "university"
              ? "Soltar para no asistir"
              : "Soltar para quitar"}
          </div>
        ) : it.organizing ? (
          <button
            className="pointer-events-auto rounded-full px-6 py-3 text-[15px] font-semibold"
            style={{
              background: "var(--material-regular)",
              backdropFilter: "blur(12px)",
              boxShadow: "var(--shadow-raised)",
              border: "1px solid var(--hairline)",
            }}
            onClick={it.exitOrganizing}
          >
            Finalizar
          </button>
        ) : null}
      </div>

      {/* undo banner */}
      {it.undo ? (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[calc(env(safe-area-inset-bottom)+14px)]">
          <div
            className="flex items-center gap-3 rounded-full py-2.5 pl-4 pr-2 text-[14px]"
            style={{
              background: "var(--material-regular)",
              backdropFilter: "blur(12px)",
              boxShadow: "var(--shadow-raised)",
              border: "1px solid var(--hairline)",
              animation: "sheet-in .3s cubic-bezier(.32,.72,0,1)",
            }}
          >
            <span className="no-truncate">{it.undo.message}</span>
            <button
              onClick={it.performUndo}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-[14px] font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Undo2 size={14} strokeWidth={2.6} />
              Deshacer
            </button>
          </div>
        </div>
      ) : null}

      {/* conflict dialog (§15) */}
      {it.pendingConflict ? (
        <ConflictDialog />
      ) : null}
    </>
  );
}

function DragOverlay() {
  const { drag } = usePlannerInteraction();
  if (!drag) return null;
  return (
    <div
      className="pointer-events-none fixed z-[60]"
      style={{
        left: drag.x - drag.grabX,
        top: drag.y - drag.grabY,
        width: drag.width,
        height: drag.height,
      }}
    >
      <ActivityCard
        item={drag.item}
        lifted
        dragHint={
          drag.item.kind.type === "university"
            ? "No asistir"
            : undefined
        }
      />
    </div>
  );
}

function ConflictDialog() {
  const it = usePlannerInteraction();
  const pending = it.pendingConflict;
  if (!pending) return null;
  const multiple = isMultiple(pending.conflict);
  const removeLabel = multiple
    ? "Quitar clases"
    : `Quitar ${pending.conflict.classes[0]?.title ?? "clase"}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        aria-label="Cancelar"
        className="absolute inset-0 bg-black/30"
        onClick={() => it.resolveConflict("cancel")}
      />
      <div
        className="relative m-3 w-full max-w-[380px] overflow-hidden rounded-[16px]"
        style={{ background: "var(--surface-raised)", boxShadow: "var(--shadow-lifted)" }}
      >
        <div className="px-5 pb-1 pt-4 text-center">
          <p className="text-[15px] font-semibold no-truncate">
            {conflictSummary(pending.conflict)}
          </p>
          {multiple ? (
            <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Coincide con: {pending.conflict.classes.map((k) => k.title).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex flex-col [&>*+*]:border-t" style={{ borderColor: "var(--hairline)" }}>
          <DialogButton label="Mantener ambas" onClick={() => it.resolveConflict("keepBoth")} />
          <DialogButton label={removeLabel} destructive onClick={() => it.resolveConflict("removeClasses")} />
          <DialogButton label="Cancelar" muted onClick={() => it.resolveConflict("cancel")} />
        </div>
      </div>
    </div>
  );
}

function DialogButton({
  label,
  onClick,
  destructive,
  muted,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-3 text-[16px] transition active:opacity-60"
      style={{
        color: destructive ? "var(--now)" : muted ? "var(--text-secondary)" : "var(--accent)",
        fontWeight: muted ? 400 : 600,
        borderColor: "var(--hairline)",
      }}
    >
      {label}
    </button>
  );
}
