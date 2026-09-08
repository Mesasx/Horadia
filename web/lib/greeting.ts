/** A warm greeting derived from Alba's local wall-clock time. */
export function timeOfDayGreeting(date: Date, ownerName: string): string {
  const hour = date.getHours();
  const name = ownerName.trim() || "Alba";

  if (hour >= 6 && hour < 12) return `Buenos días ${name} <3`;
  if (hour >= 12 && hour < 15) return "Qué tal la mañana <3";
  if (hour >= 15 && hour < 21) return "Que se dé bien la tarde <3";
  return "No te acuestes muy tarde <3";
}
