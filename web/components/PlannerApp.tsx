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
import { TabBar, type Tab } from "@/components/TabBar";
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
  const [sheet, setSheet] = useState<SheetState>(null);
  const [now, setNow] = useState(() => Date.now());
  const hydrated = usePlannerStore((s) => s.hydrated);
  useTheme();

  // Keep "now" fresh for the AHORA line / relative labels.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

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

  return (
    <PlannerInteractionProvider>
      <div className="flex h-[100dvh] flex-col" style={{ background: "var(--bg)" }}>
        <main className="min-h-0 flex-1 pb-[68px]">
          {tab === "week" ? (
            <WeekView now={now} onSelectItem={onSelectItem} onSelectFree={onSelectFree} />
          ) : null}
          {tab === "today" ? (
            <TodayView now={now} onSelectItem={onSelectItem} onSelectFree={onSelectFree} />
          ) : null}
          {tab === "stats" ? <StatsView now={now} /> : null}
          {tab === "settings" ? <SettingsView /> : null}
        </main>

        <TabBar tab={tab} onChange={setTab} />
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
