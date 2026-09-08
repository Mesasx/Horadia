/**
 * Minimal identity model for the future subject workspace. Content storage is
 * intentionally out of scope for this phase; keeping identity separate means
 * UniversitySubject will not need to absorb notes, tasks and files later.
 */
export interface SubjectWorkspace {
  id: string;
  subjectCode: string;
}

export function subjectWorkspace(subjectCode: string): SubjectWorkspace {
  return { id: `subject:${subjectCode}`, subjectCode };
}
