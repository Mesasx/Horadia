"use client";

import { CalendarRange, CalendarCheck, ChartNoAxesColumn, Settings } from "lucide-react";

export type Tab = "week" | "today" | "stats" | "settings";
export const TAB_ORDER: Tab[] = ["week", "today", "stats", "settings"];

const TABS: { id: Tab; label: string; Icon: typeof CalendarRange }[] = [
  { id: "week", label: "Semana", Icon: CalendarRange },
  { id: "today", label: "Hoy", Icon: CalendarCheck },
  { id: "stats", label: "Estadísticas", Icon: ChartNoAxesColumn },
  { id: "settings", label: "Ajustes", Icon: Settings },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around px-2 pt-1.5"
      style={{
        background: "var(--material-regular)",
        backdropFilter: "blur(18px)",
        borderTop: "1px solid var(--hairline)",
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            type="button"
            key={id}
            onClick={() => onChange(id)}
            className="flex min-h-[50px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors duration-200"
            style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}
            aria-current={active ? "page" : undefined}
          >
            <span
              className="flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-200"
              style={{
                background: active ? "var(--accent-soft)" : "transparent",
                transform: active ? "translateY(-1px)" : "translateY(0)",
              }}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className="no-truncate text-[10px] font-medium transition-colors duration-200">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
