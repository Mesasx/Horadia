"use client";

/** Minimal activity creation (§10): name + colour + icon, nothing else. */

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { paletteVars, PASTEL_TOKENS } from "@/lib/palette";
import { iconFor, PICKER_ICONS } from "@/lib/icons";
import type { PastelToken } from "@/lib/palette";

export function NewActivitySheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; palette: PastelToken; symbolName: string }) => void;
}) {
  const [name, setName] = useState("");
  const [palette, setPalette] = useState<PastelToken>("lavender");
  const [symbol, setSymbol] = useState("sparkles");

  return (
    <Sheet open={open} onClose={onClose} title="Crear actividad">
      <label className="block text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
        Nombre
      </label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="p. ej. Fisioterapia"
        className="mt-1.5 w-full rounded-[12px] px-3 py-2.5 text-[16px] outline-none"
        style={{ background: "var(--surface-sunken)" }}
      />

      <p className="mt-4 text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>Color</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {PASTEL_TOKENS.map((token) => {
          const c = paletteVars(token);
          return (
            <button
              key={token}
              onClick={() => setPalette(token)}
              className="h-8 w-8 rounded-full"
              style={{
                background: c.fill,
                border: `2px solid ${palette === token ? c.accent : "transparent"}`,
              }}
            />
          );
        })}
      </div>

      <p className="mt-4 text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>Icono</p>
      <div className="mt-1.5 grid grid-cols-8 gap-2">
        {PICKER_ICONS.map((iconName) => {
          const Icon = iconFor(iconName);
          const active = symbol === iconName;
          return (
            <button
              key={iconName}
              onClick={() => setSymbol(iconName)}
              className="flex aspect-square items-center justify-center rounded-[10px]"
              style={{
                background: active ? "var(--accent-soft)" : "var(--surface-sunken)",
                color: active ? "var(--accent)" : "var(--text)",
              }}
            >
              <Icon size={17} />
            </button>
          );
        })}
      </div>

      <button
        disabled={!name.trim()}
        onClick={() => {
          onCreate({ name: name.trim(), palette, symbolName: symbol });
          setName("");
        }}
        className="mt-6 w-full rounded-[14px] py-3 text-[16px] font-semibold text-white disabled:opacity-30"
        style={{ background: "var(--accent)" }}
      >
        Añadir
      </button>
    </Sheet>
  );
}
