/** Zoom levels for the planner shell. Month and course renderers are future work. */
export type PlannerScale = "week" | "month" | "course";

export const PLANNER_SCALE_LABELS: Record<PlannerScale, string> = {
  week: "Semana",
  month: "Mes",
  course: "Curso",
};
