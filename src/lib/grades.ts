import { apiFetch } from "@/lib/api";

export type Grade = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
};

export async function loadGrades(): Promise<Grade[]> {
  return await apiFetch<Grade[]>("/api/grades", { method: "GET" });
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
  patch: { code?: string; label?: string; sortOrder?: number }
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/grades/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

