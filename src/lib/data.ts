import { apiFetch } from "@/lib/api";

// All surahs data (full Quran reference)
const ALL_SURAHS_DATA: Record<number, { name: string; arabic: string }> = {
  1: { name: "Al-Fatiha", arabic: "الفاتحة" },
  78: { name: "An-Naba", arabic: "النبأ" },
  79: { name: "An-Naziat", arabic: "النازعات" },
  80: { name: "Abasa", arabic: "عبس" },
  81: { name: "At-Takwir", arabic: "التكوير" },
  82: { name: "Al-Infitar", arabic: "الانفطار" },
  83: { name: "Al-Mutaffifin", arabic: "المطففين" },
  84: { name: "Al-Inshiqaq", arabic: "الانشقاق" },
  85: { name: "Al-Buruj", arabic: "البروج" },
  86: { name: "At-Tariq", arabic: "الطارق" },
  87: { name: "Al-Ala", arabic: "الأعلى" },
  88: { name: "Al-Ghashiyah", arabic: "الغاشية" },
  89: { name: "Al-Fajr", arabic: "الفجر" },
  90: { name: "Al-Balad", arabic: "البلد" },
  91: { name: "Ash-Shams", arabic: "الشمس" },
  92: { name: "Al-Layl", arabic: "الليل" },
  93: { name: "Ad-Duha", arabic: "الضحى" },
  94: { name: "Al-Inshirah", arabic: "الشرح" },
  95: { name: "At-Tin", arabic: "التين" },
  96: { name: "Al-Alaq", arabic: "العلق" },
  97: { name: "Al-Qadr", arabic: "القدر" },
  98: { name: "Al-Bayyinah", arabic: "البيّنة" },
  99: { name: "Az-Zalzalah", arabic: "الزلزلة" },
  100: { name: "Al-Adiyat", arabic: "العاديات" },
  101: { name: "Al-Qariah", arabic: "القارعة" },
  102: { name: "At-Takathur", arabic: "التكاثر" },
  103: { name: "Al-Asr", arabic: "العصر" },
  104: { name: "Al-Humazah", arabic: "الهمزة" },
  105: { name: "Al-Fil", arabic: "الفيل" },
  106: { name: "Quraysh", arabic: "قريش" },
  107: { name: "Al-Maun", arabic: "الماعون" },
  108: { name: "Al-Kawthar", arabic: "الكوثر" },
  109: { name: "Al-Kafirun", arabic: "الكافرون" },
  110: { name: "An-Nasr", arabic: "النصر" },
  111: { name: "Al-Masad", arabic: "المسد" },
  112: { name: "Al-Ikhlas", arabic: "الإخلاص" },
  113: { name: "Al-Falaq", arabic: "الفلق" },
  114: { name: "An-Nas", arabic: "الناس" },
};

// Configuration for grade levels
export const GRADE_CONFIG = {
  "4th": { lastNSurahs: 21, label: "4th Grade (Last 21 Surahs)" },
  "5th": { lastNSurahs: 30, label: "5th Grade (Last 30 Surahs)" },
  "6th": { lastNSurahs: 37, label: "6th Grade (Juz Amma)" },
} as const;

export type GradeLevel = keyof typeof GRADE_CONFIG;

// Default grade level
export const DEFAULT_GRADE: GradeLevel = "4th";

// Generate surahs array for a given count (descending order: 114 → lower)
export function getSurahsForGrade(grade: GradeLevel = DEFAULT_GRADE) {
  const count = GRADE_CONFIG[grade].lastNSurahs;
  const surahs = [];
  for (let i = 114; i > 114 - count && i >= 1; i--) {
    const data = ALL_SURAHS_DATA[i];
    if (data) {
      surahs.push({ number: i, name: data.name, arabic: data.arabic });
    }
  }
  return surahs;
}

// Default export for backward compatibility (4th grade, descending)
export const SURAHS = getSurahsForGrade(DEFAULT_GRADE);

export interface SurahProgress {
  stars: number;
  firstAttempt: boolean;
  attempts: number;
}

export interface CustomItemProgress {
  id: string;
  title: string;
  stars: number;
  firstAttempt: boolean;
  attempts: number;
}

export interface StudentData {
  id: string;
  name: string;
  grade?: string;
  progress: Record<number, SurahProgress>;
  customItems: CustomItemProgress[];
}

export async function loadData(grade?: string): Promise<StudentData[]> {
  const qs = grade ? `?${new URLSearchParams({ grade }).toString()}` : "";
  return await apiFetch<StudentData[]>(`/api/students${qs}`, { method: "GET" });
}

export async function upsertSurahProgress(
  studentId: string,
  surahNumber: number,
  stars: number,
  firstAttempt: boolean,
  attempts: number
): Promise<void> {
  await apiFetch<{ ok: true }>("/api/progress/surah", {
    method: "POST",
    body: JSON.stringify({ studentId, surahNumber, stars, firstAttempt, attempts }),
  });
}

export async function deleteSurahProgress(
  studentId: string,
  surahNumber: number
): Promise<void> {
  const params = new URLSearchParams({ studentId, surahNumber: String(surahNumber) });
  await apiFetch<{ ok: true }>(`/api/progress/surah?${params.toString()}`, { method: "DELETE" });
}

export async function addCustomItem(studentId: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  await apiFetch<{ id: string }>("/api/custom-items", {
    method: "POST",
    body: JSON.stringify({ studentId, title: trimmed }),
  });
}

export async function updateCustomItemProgress(
  itemId: string,
  stars: number,
  firstAttempt: boolean,
  attempts: number
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/custom-items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ stars, firstAttempt, attempts }),
  });
}

export async function deleteCustomItem(itemId: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/custom-items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

export async function addStudent(name: string, grade: string = "4th"): Promise<string> {
  const res = await apiFetch<{ id: string }>("/api/students", {
    method: "POST",
    body: JSON.stringify({ name: name.trim(), grade }),
  });
  return res.id;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/students/${encodeURIComponent(studentId)}`, { method: "DELETE" });
}
export function getStudentStats(student: StudentData, surahTotal: number) {
  const surahCompleted = Object.values(student.progress).filter((p) => p.stars === 5).length;
  const customCompleted = student.customItems.filter((p) => p.stars === 5).length;
  const completed = surahCompleted + customCompleted;

  const surahFirstAttemptPerfect = Object.values(student.progress).filter(
    (p) => p.stars === 5 && p.firstAttempt
  ).length;
  const customFirstAttemptPerfect = student.customItems.filter((p) => p.stars === 5 && p.firstAttempt).length;
  const firstAttemptPerfect = surahFirstAttemptPerfect + customFirstAttemptPerfect;

  const surahStars = Object.values(student.progress).reduce((sum, p) => sum + p.stars, 0);
  const customStars = student.customItems.reduce((sum, p) => sum + p.stars, 0);
  const totalStars = surahStars + customStars;

  const total = surahTotal + student.customItems.length;
  return { completed, firstAttemptPerfect, totalStars, total };
}
