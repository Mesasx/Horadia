"use client";

/**
 * Orchestrates the *consequences* of a drag (product brief §12–15): moving,
 * removing, omitting a class, conflict resolution, undo, and the "jiggle"
 * organisation mode (§13). No scheduling logic lives in components — they call
 * these methods, exactly like the SwiftUI `PlannerInteraction`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePlannerStore } from "@/store/planner-store";
import { timelineFor } from "@/lib/planner";
import { timelineItems, type ScheduledItem } from "@/lib/scheduled-item";
import {
  detectConflict,
  conflictClassKeys,
  type Conflict,
} from "@/lib/conflict";
import { haptic } from "@/lib/haptics";

export interface DragVisual {
  item: ScheduledItem;
  /** viewport coords of the pointer */
  x: number;
  y: number;
  /** pointer offset inside the card at lift time */
  grabX: number;
  grabY: number;
  width: number;
  height: number;
}

export interface PendingConflict {
  conflict: Conflict;
  revert: () => void;
}

export interface UndoAction {
  message: string;
  restore: () => void;
}

interface InteractionValue {
  organizing: boolean;
  enterOrganizing: () => void;
  exitOrganizing: () => void;

  drag: DragVisual | null;
  draggingId: string | null;
  overDelete: boolean;
  beginDrag: (v: DragVisual) => void;
  updateDrag: (patch: Partial<Pick<DragVisual, "x" | "y">> & { overDelete?: boolean }) => void;
  endDrag: () => void;

  commitMove: (item: ScheduledItem, targetStart: number, day: Date) => void;
  commitRemove: (item: ScheduledItem) => void;

  pendingConflict: PendingConflict | null;
  resolveConflict: (choice: "keepBoth" | "removeClasses" | "cancel") => void;

  undo: UndoAction | null;
  performUndo: () => void;
  dismissUndo: () => void;
}

const Ctx = createContext<InteractionValue | null>(null);

export function usePlannerInteraction(): InteractionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlannerInteraction outside provider");
  return v;
}

export function PlannerInteractionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Actions only — never subscribe the provider to planner state.
  const store = usePlannerStore.getState;
  const [organizing, setOrganizing] = useState(false);
  const [drag, setDrag] = useState<DragVisual | null>(null);
  const [overDelete, setOverDelete] = useState(false);
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUndo = useCallback((action: UndoAction) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(action);
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }, []);

  const dismissUndo = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(null);
  }, []);

  const performUndo = useCallback(() => {
    undo?.restore();
    dismissUndo();
  }, [undo, dismissUndo]);

  const enterOrganizing = useCallback(() => {
    setOrganizing(true);
    haptic("pick");
  }, []);
  const exitOrganizing = useCallback(() => setOrganizing(false), []);

  const beginDrag = useCallback((v: DragVisual) => {
    setDrag(v);
    setOverDelete(false);
    haptic("pick");
  }, []);

  const updateDrag = useCallback(
    (patch: Partial<Pick<DragVisual, "x" | "y">> & { overDelete?: boolean }) => {
      setDrag((d) => (d ? { ...d, x: patch.x ?? d.x, y: patch.y ?? d.y } : d));
      if (patch.overDelete !== undefined) setOverDelete(patch.overDelete);
    },
    [],
  );

  const endDrag = useCallback(() => {
    setDrag(null);
    setOverDelete(false);
  }, []);

  const commitMove = useCallback(
    (item: ScheduledItem, targetStart: number, day: Date) => {
      endDrag();
      const before = { ...item };
      store().move(item.id, targetStart);
      haptic("drop");

      // Re-read the day and look for an overlap with a class (§15).
      const moved = usePlannerStore
        .getState()
        .personalItems.find((i) => i.id === item.id);
      if (!moved) return;
      const targetDay = new Date(moved.start);
      const dayItems = timelineItems(timelineFor(usePlannerStore.getState(), targetDay));
      const conflict = detectConflict(moved, dayItems);
      if (conflict) {
        haptic("conflict");
        setPendingConflict({
          conflict,
          revert: () => usePlannerStore.getState().replace(before),
        });
      }
      void day;
    },
    [endDrag, store],
  );

  const commitRemove = useCallback(
    (item: ScheduledItem) => {
      endDrag();
      if (item.instanceKey && !item.isPinned && item.kind.type === "university") {
        const key = item.instanceKey;
        store().omit(key);
        haptic("delete");
        showUndo({
          message: "Clase quitada de este día",
          restore: () => usePlannerStore.getState().restore(key),
        });
        return;
      }
      const snapshot = { ...item };
      store().remove(item.id);
      haptic("delete");
      showUndo({
        message: `"${item.title}" eliminada`,
        restore: () => usePlannerStore.getState().add(snapshot),
      });
    },
    [endDrag, showUndo, store],
  );

  const resolveConflict = useCallback(
    (choice: "keepBoth" | "removeClasses" | "cancel") => {
      const pending = pendingConflict;
      setPendingConflict(null);
      if (!pending) return;
      if (choice === "cancel") {
        pending.revert();
        return;
      }
      if (choice === "removeClasses") {
        const keys = conflictClassKeys(pending.conflict);
        keys.forEach((k) => usePlannerStore.getState().omit(k));
        haptic("delete");
        showUndo({
          message:
            keys.length > 1 ? "Clases quitadas de este día" : "Clase quitada de este día",
          restore: () => keys.forEach((k) => usePlannerStore.getState().restore(k)),
        });
      }
    },
    [pendingConflict, showUndo],
  );

  const value = useMemo<InteractionValue>(
    () => ({
      organizing,
      enterOrganizing,
      exitOrganizing,
      drag,
      draggingId: drag?.item.id ?? null,
      overDelete,
      beginDrag,
      updateDrag,
      endDrag,
      commitMove,
      commitRemove,
      pendingConflict,
      resolveConflict,
      undo,
      performUndo,
      dismissUndo,
    }),
    [
      organizing,
      enterOrganizing,
      exitOrganizing,
      drag,
      overDelete,
      beginDrag,
      updateDrag,
      endDrag,
      commitMove,
      commitRemove,
      pendingConflict,
      resolveConflict,
      undo,
      performUndo,
      dismissUndo,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
