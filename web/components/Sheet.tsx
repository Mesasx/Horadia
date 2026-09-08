"use client";

/**
 * A native-feeling bottom sheet: dimmed backdrop, rounded top, grab handle,
 * spring-in / spring-out, safe-area aware. Closes on backdrop tap or Escape.
 * (Product brief §3 — sheets, materials; §18 — activity actions.)
 */

import { Children, Fragment, useEffect, useRef } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-[fade_.2s_ease]"
        style={{ animationName: "fade" }}
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-[560px] max-h-[88vh] overflow-y-auto rounded-t-[22px] safe-bottom"
        style={{
          background: "var(--surface)",
          boxShadow: "var(--shadow-lifted)",
          animation: "sheet-in .34s cubic-bezier(.32,.72,0,1)",
        }}
      >
        <div className="sticky top-0 z-10" style={{ background: "var(--surface)" }}>
          <div className="flex justify-center pt-2.5 pb-1.5">
            <span
              className="h-1 w-9 rounded-full"
              style={{ background: "var(--text-tertiary)" }}
            />
          </div>
          {title ? (
            <h2 className="px-5 pb-3 pt-1 text-[17px] font-semibold no-truncate">
              {title}
            </h2>
          ) : null}
        </div>
        <div className="px-4 pb-6">{children}</div>
      </div>

      <style>{`
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sheet-in { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}

/** A grouped list row, iOS Settings style. */
export function SheetRow({
  icon,
  label,
  detail,
  destructive,
  onClick,
  disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  detail?: React.ReactNode;
  destructive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[16px] transition active:opacity-60 disabled:opacity-35"
      style={{ color: destructive ? "var(--now)" : "var(--text)" }}
    >
      {icon ? <span className="shrink-0 opacity-80">{icon}</span> : null}
      <span className="no-truncate flex-1">{label}</span>
      {detail ? (
        <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
          {detail}
        </span>
      ) : null}
    </button>
  );
}

/** Card wrapper grouping rows with hairline separators. */
export function SheetGroup({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <div
      className="my-2 overflow-hidden rounded-[14px]"
      style={{ background: "var(--surface-raised)" }}
    >
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <div className="ml-4 h-px" style={{ background: "var(--hairline)" }} />
          ) : null}
          {child}
        </Fragment>
      ))}
    </div>
  );
}
