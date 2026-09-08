"use client";

/**
 * Maps the string `symbolName`s used across the scheduling layer (carried over
 * from the iOS SF Symbol names, then normalised to Lucide) to real icon
 * components. Unknown names fall back to a neutral dot.
 */

import {
  Activity,
  Book,
  BookOpen,
  Briefcase,
  Calendar,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  ClipboardList,
  Clock,
  Coffee,
  Dumbbell,
  FlaskConical,
  Flower2,
  GraduationCap,
  Heart,
  House,
  Lock,
  Moon,
  Music,
  Pencil,
  Pill,
  Plus,
  ShoppingCart,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  activity: Activity,
  book: Book,
  "book-open": BookOpen,
  "book.closed": Book,
  briefcase: Briefcase,
  calendar: Calendar,
  "calendar-days": CalendarDays,
  "chart-column": ChartNoAxesColumn,
  check: Check,
  "clipboard-list": ClipboardList,
  "pencil.and.list.clipboard": ClipboardList,
  clock: Clock,
  coffee: Coffee,
  dumbbell: Dumbbell,
  "figure.run": Activity,
  "figure.pilates": Flower2,
  "flask-conical": FlaskConical,
  flask: FlaskConical,
  flower: Flower2,
  "graduation-cap": GraduationCap,
  heart: Heart,
  house: House,
  lock: Lock,
  moon: Moon,
  "moon.zzz": Moon,
  music: Music,
  pencil: Pencil,
  pill: Pill,
  plus: Plus,
  "shopping-cart": ShoppingCart,
  sparkles: Sparkles,
  utensils: Utensils,
};

/** The set offered in the "crear actividad" icon picker (§10). */
export const PICKER_ICONS = [
  "book-open",
  "briefcase",
  "activity",
  "dumbbell",
  "moon",
  "coffee",
  "utensils",
  "music",
  "heart",
  "flower",
  "pill",
  "shopping-cart",
  "graduation-cap",
  "sparkles",
  "clock",
  "calendar",
];

export function iconFor(name: string | undefined | null): LucideIcon {
  if (!name) return Sparkles;
  return MAP[name] ?? Sparkles;
}
