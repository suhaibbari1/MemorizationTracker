import { apiFetch } from "@/lib/api";

export type Grade = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  is_archived?: number;
  archived_at?: string | null;
};

export async function loadGrades(opts?: { includeArchived?: boolean }): Promise<Grade[]> {
  const qs = opts?.includeArchived ? "?includeArchived=1" : "";
  return await apiFetch<Grade[]>(`/api/grades${qs}`, { method: "GET" });
}

export async function addGrade(input: { code: string; label: string; sortOrder?: number }): Promise<string> {
  const res = await apiFetch<{ id: string }>("/api/grades", {
    method: "POST",
    body: JSON.stringify({ code: input.code, label: input.label, sortOrder: input.sortOrder ?? 0 }),
  });
  return res.id;
}

export async function deleteGrade(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/grades/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function reorderGrades(ids: string[]): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/grades/reorder`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function updateGrade(
  id: string,
  patch: { code?: string; label?: string; sortOrder?: number; isArchived?: boolean }
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/grades/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

