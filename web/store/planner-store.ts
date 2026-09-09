/**
 * The React-facing planner store: a thin Zustand wrapper over the pure logic in
 * `lib/planner.ts`, with `localStorage` persistence (product brief §29 — local
 * storage, works offline, no login / backend / server; iCloud is out of scope
 * for the web build).
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type PlannerState,
  type Preferences,
  initialPlannerState,
  addItem,
  removeItem,
  replaceItem,
  moveItem,
  rescheduleItem,
  moveItemToDay,
  resizeItem,
  togglePinned,
  toggleCompleted,
  duplicateItem,
  copyItemToDay,
  omitClass,
  restoreClass,
  addToLibrary,
  setSubjectColor,
} from "@/lib/planner";
import type { ScheduledItem } from "@/lib/scheduled-item";
import type { LibraryActivity } from "@/lib/seed";

export interface PlannerStore extends PlannerState {
  hydrated: boolean;
  _setHydrated: () => void;

  add: (item: ScheduledItem) => void;
  remove: (id: string) => void;
  replace: (item: ScheduledItem) => void;
  move: (id: string, start: number) => void;
  reschedule: (id: string, start: number, end: number) => void;
  moveToDay: (id: string, day: Date) => void;
  resize: (id: string, end: number) => void;
  togglePin: (id: string) => void;
  toggleDone: (id: string) => void;
  duplicate: (id: string) => ScheduledItem | undefined;
  copyToDay: (id: string, day: Date) => ScheduledItem | undefined;
  omit: (instanceKey: string) => void;
  restore: (instanceKey: string) => void;
  addLibraryActivity: (input: {
    name: string;
    kind: LibraryActivity["kind"];
    palette: LibraryActivity["palette"];
    symbolName: string;
  }) => LibraryActivity;
  setPreferences: (patch: Partial<Preferences>) => void;
  setSubjectColour: (code: string, color: string) => void;
  resetAll: () => void;
}

const STORAGE_KEY = "horadia.planner.v1";

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      ...initialPlannerState(),
      hydrated: false,
      _setHydrated: () => set({ hydrated: true }),

      add: (item) => set((s) => addItem(s, item)),
      remove: (id) => set((s) => removeItem(s, id)),
      replace: (item) => set((s) => replaceItem(s, item)),
      move: (id, start) => set((s) => moveItem(s, id, start)),
      reschedule: (id, start, end) =>
        set((s) => rescheduleItem(s, id, start, end)),
      moveToDay: (id, day) => set((s) => moveItemToDay(s, id, day)),
      resize: (id, end) => set((s) => resizeItem(s, id, end)),
      togglePin: (id) => set((s) => togglePinned(s, id)),
      toggleDone: (id) => set((s) => toggleCompleted(s, id)),
      duplicate: (id) => {
        const { state, clone } = duplicateItem(get(), id);
        set(state);
        return clone;
      },
      copyToDay: (id, day) => {
        const { state, clone } = copyItemToDay(get(), id, day);
        set(state);
        return clone;
      },
      omit: (instanceKey) => set((s) => omitClass(s, instanceKey)),
      restore: (instanceKey) => set((s) => restoreClass(s, instanceKey)),
      addLibraryActivity: (input) => {
        const { state, created } = addToLibrary(get(), input);
        set(state);
        return created;
      },
      setPreferences: (patch) =>
        set((s) => ({ preferences: { ...s.preferences, ...patch } })),
      setSubjectColour: (code, color) => set((s) => setSubjectColor(s, code, color)),
      resetAll: () => set({ ...initialPlannerState() }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        personalItems: s.personalItems,
        omittedInstanceKeys: s.omittedInstanceKeys,
        library: s.library,
        preferences: s.preferences,
        subjectColors: s.subjectColors,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
