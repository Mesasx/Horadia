"use client";

/**
 * The app shell: tab state, the sheet router, the interaction provider and the
 * shared drag chrome. Everything below is client-rendered so it reasons in the
 * viewer's own timezone (Alba's is Europe/Madrid).
 */

import { useEffect, useState } from "react";
import { usePlannerStore } from "@/store/planner-store";
import { PlannerInteractionProvider } from "@/components/interaction/PlannerInteractionContext";
import { PlannerChrome } from "@/components/interaction/PlannerChrome";
import { TAB_ORDER, TabBar, type Tab } from "@/components/TabBar";
import { WeekView } from "@/components/week/WeekView";
import { TodayView } from "@/components/today/TodayView";
import { StatsView } from "@/components/stats/StatsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { ActivityDetailSheet } from "@/components/sheets/ActivityDetailSheet";
import { QuickCreateSheet } from "@/components/sheets/QuickCreateSheet";
import { useTheme } from "@/components/useTheme";
import type { ScheduledItem } from "@/lib/scheduled-item";
import type { TimeSlot } from "@/lib/timeslot";

type SheetState =
  | { type: "detail"; item: ScheduledItem }
  | { type: "quickCreate"; slot: TimeSlot; day: Date }
  | null;

export function PlannerApp() {
  const [tab, setTab] = useState<Tab>("week");
  const [tabDirection, setTabDirection] = useState<"forward" | "backward">("forward");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [now, setNow] = useState(() => Date.now());
  const hydrated = usePlannerStore((s) => s.hydrated);
  useTheme();

  // Keep "now" fresh for the AHORA line / relative labels.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Belt-and-braces: if persist rehydration never reports back (e.g. storage
  // disabled), still show the app after mount rather than hanging on the splash.
  useEffect(() => {
    if (hydrated) return;
    const id = setTimeout(() => usePlannerStore.setState({ hydrated: true }), 400);
    return () => clearTimeout(id);
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex h-[100dvh] items-center justify-center" style={{ background: "var(--bg)" }}>
        <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
          Horadia
        </span>
      </div>
    );
  }

  const onSelectItem = (item: ScheduledItem) => setSheet({ type: "detail", item });
  const onSelectFree = (slot: TimeSlot, day: Date) =>
    setSheet({ type: "quickCreate", slot, day });

  const changeTab = (next: Tab) => {
    if (next === tab) return;
    setTabDirection(
      TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? "forward" : "backward",
    );
    setTab(next);
  };

  const viewFor = (view: Tab) => {
    switch (view) {
      case "week":
        return <WeekView now={now} onSelectItem={onSelectItem} onSelectFree={onSelectFree} />;
      case "today":
        return <TodayView now={now} onSelectItem={onSelectItem} onSelectFree={onSelectFree} />;
      case "stats":
        return <StatsView now={now} />;
      case "settings":
        return <SettingsView />;
    }
  };

  return (
    <PlannerInteractionProvider>
      <div className="flex h-[100dvh] flex-col" style={{ background: "var(--bg)" }}>
        <main className="relative min-h-0 flex-1 overflow-hidden pb-[68px]">
          <div
            key={tab}
            className={`tab-view tab-enter-${tabDirection} absolute inset-0`}
          >
            {viewFor(tab)}
          </div>
        </main>

        <TabBar tab={tab} onChange={changeTab} />
        <PlannerChrome />
      </div>

      <ActivityDetailSheet
        selected={sheet?.type === "detail" ? sheet.item : null}
        onClose={() => setSheet(null)}
      />
      <QuickCreateSheet
        open={sheet?.type === "quickCreate"}
        slot={
          sheet?.type === "quickCreate"
            ? { slot: sheet.slot, day: sheet.day }
            : null
        }
        onClose={() => setSheet(null)}
      />
    </PlannerInteractionProvider>
  );
}
