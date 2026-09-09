"use client";

/**
 * The Ajustes screen (§38). Perfil (name + birthday), Universidad (subject list
 * — colour is editable, the timetable is not), tema, and app info.
 */

import { useEffect, useState } from "react";
import { usePlannerStore } from "@/store/planner-store";
import { ALL_SUBJECTS, SCHEDULE_PROVISIONAL, SCHEDULE_COVERAGE } from "@/lib/planner";
import { subjectsWithColors } from "@/lib/planner";
import { paletteVars, PASTEL_TOKENS, PASTEL_NAMES } from "@/lib/palette";
import { formatDayMonthLong } from "@/lib/format";
import { useTheme } from "@/components/useTheme";
import {
  enablePushNotifications,
  getPushStatus,
  sendTestPush,
  syncPushReminders,
  type PushStatus,
} from "@/lib/push-client";

export function SettingsView() {
  const state = usePlannerStore();
  const setSubjectColour = usePlannerStore((s) => s.setSubjectColour);
  const subjects = subjectsWithColors(state);
  const [editing, setEditing] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    void getPushStatus().then(setPushStatus);
  }, []);

  const birthday = new Date(2000, state.preferences.birthdayMonth - 1, state.preferences.birthdayDay);

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top px-4 pb-2 pt-3">
        <h1 className="text-[22px] font-bold">Ajustes</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
        <Section title="Perfil">
          <Row label="Nombre" detail={state.preferences.ownerName} />
          <Row label="Cumpleaños" detail={formatDayMonthLong(birthday)} />
        </Section>

        <Section title="Apariencia">
          <div className="flex gap-2 p-3">
            {(["system", "light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="flex-1 rounded-[10px] py-2 text-[13px] font-semibold capitalize transition"
                style={{
                  background: theme === t ? "var(--accent-soft)" : "var(--surface-sunken)",
                  color: theme === t ? "var(--accent)" : "var(--text)",
                }}
              >
                {t === "system" ? "Sistema" : t === "light" ? "Claro" : "Oscuro"}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Notificaciones"
          footer={
            pushStatus?.needsHomeScreenInstall
              ? "En iPhone, añade Horadia a la pantalla de inicio y ábrela desde su icono."
              : "El permiso solo se solicita cuando pulsas Activar notificaciones."
          }
        >
          <Row label="Estado" detail={pushStatusLabel(pushStatus)} />
          <button
            type="button"
            disabled={pushBusy || pushStatus?.subscribed}
            onClick={async () => {
              setPushBusy(true);
              setPushMessage(null);
              try {
                const status = await enablePushNotifications(
                  usePlannerStore.getState().reminders,
                );
                setPushStatus(status);
                setPushMessage("Notificaciones activadas correctamente.");
              } catch (error) {
                setPushMessage(
                  error instanceof Error ? error.message : "No se pudieron activar.",
                );
                setPushStatus(await getPushStatus());
              } finally {
                setPushBusy(false);
              }
            }}
            className="w-full px-4 py-3 text-left text-[15px] font-medium disabled:opacity-40"
            style={{ color: "var(--accent)" }}
          >
            {pushStatus?.subscribed
              ? "Notificaciones activadas"
              : "Activar notificaciones"}
          </button>
          <button
            type="button"
            disabled={pushBusy || !pushStatus?.subscribed}
            onClick={async () => {
              setPushBusy(true);
              setPushMessage(null);
              try {
                await sendTestPush();
                setPushMessage("Notificación de prueba enviada.");
              } catch (error) {
                setPushMessage(
                  error instanceof Error ? error.message : "No se pudo enviar la prueba.",
                );
              } finally {
                setPushBusy(false);
              }
            }}
            className="w-full px-4 py-3 text-left text-[15px] font-medium disabled:opacity-40"
            style={{ color: "var(--accent)" }}
          >
            Enviar notificación de prueba
          </button>
          {pushMessage ? (
            <p
              className="px-4 py-3 text-[13px]"
              role="status"
              style={{ color: "var(--text-secondary)" }}
            >
              {pushMessage}
            </p>
          ) : null}
        </Section>

        <Section
          title="Universidad"
          footer="El horario oficial no se puede editar. Solo el color de cada asignatura."
        >
          {ALL_SUBJECTS.map((s) => {
            const c = paletteVars(subjects[s.code]?.color ?? s.color);
            return (
              <div key={s.code}>
                <button
                  onClick={() => setEditing(editing === s.code ? null : s.code)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: c.accent }} />
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium no-truncate">{s.code}</span>
                    <span className="block text-[12px] no-truncate" style={{ color: "var(--text-secondary)" }}>
                      {s.fullName}
                    </span>
                  </span>
                </button>
                {editing === s.code ? (
                  <div className="flex flex-wrap gap-2 px-4 pb-3">
                    {PASTEL_TOKENS.map((token) => {
                      const tc = paletteVars(token);
                      return (
                        <button
                          key={token}
                          aria-label={PASTEL_NAMES[token]}
                          onClick={() => {
                            setSubjectColour(s.code, token);
                            setEditing(null);
                          }}
                          className="h-7 w-7 rounded-full"
                          style={{
                            background: tc.fill,
                            border: `2px solid ${(subjects[s.code]?.color ?? s.color) === token ? tc.accent : "transparent"}`,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </Section>

        <Section title="Datos">
          <Row
            label="Horario"
            detail={SCHEDULE_PROVISIONAL ? "Provisional (patrón)" : "DAMERO oficial"}
          />
          {SCHEDULE_COVERAGE ? (
            <Row label="Cobertura" detail={`${SCHEDULE_COVERAGE.from} → ${SCHEDULE_COVERAGE.to}`} />
          ) : null}
          <button
            onClick={() => {
              if (confirm("¿Restablecer todas las actividades y ajustes?")) {
                usePlannerStore.getState().resetAll();
                void syncPushReminders([], true);
              }
            }}
            className="px-4 py-3 text-left text-[15px]"
            style={{ color: "var(--now)" }}
          >
            Restablecer datos
          </button>
        </Section>

        <p className="mt-4 text-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Horadia · web · v0.3 (Fase 3)
        </p>
      </div>
    </div>
  );
}

function pushStatusLabel(status: PushStatus | null): string {
  if (!status) return "Comprobando…";
  if (status.needsHomeScreenInstall) return "Requiere instalación";
  if (!status.supported) return "No disponibles";
  if (status.permission === "denied") return "Bloqueadas";
  return status.subscribed ? "Activas" : "Desactivadas";
}

function Section({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <h2 className="px-3 pb-1.5 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h2>
      <div
        className="overflow-hidden rounded-[var(--r-card)] [&>*+*]:border-t"
        style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
      >
        {children}
      </div>
      {footer ? (
        <p className="px-3 pt-1.5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {footer}
        </p>
      ) : null}
    </div>
  );
}

function Row({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
      <span className="flex-1 text-[15px] no-truncate">{label}</span>
      {detail ? (
        <span className="text-[15px] no-truncate" style={{ color: "var(--text-secondary)" }}>
          {detail}
        </span>
      ) : null}
    </div>
  );
}
