import { apiFetch } from "@/lib/api";

export type GradeSurah = {
  id: string;
  grade_code: string;
  surah_number: number;
  sort_order: number;
};

export async function loadGradeSurahs(grade: string): Promise<GradeSurah[]> {
  const qs = new URLSearchParams({ grade }).toString();
  return await apiFetch<GradeSurah[]>(`/api/grade-surahs?${qs}`, { method: "GET" });
}

export async function addGradeSurah(grade: string, surahNumber: number): Promise<string> {
  const res = await apiFetch<{ id: string }>(`/api/grade-surahs`, {
    method: "POST",
    body: JSON.stringify({ grade, surahNumber }),
  });
  return res.id;
}

export async function deleteGradeSurah(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/grade-surahs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function reorderGradeSurahs(grade: string, ids: string[]): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/grade-surahs/reorder`, {
    method: "POST",
    body: JSON.stringify({ grade, ids }),
  });
}

