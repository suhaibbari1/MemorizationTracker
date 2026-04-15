export type SurahInfo = { number: number; name: string; arabic: string };

// Juz 30 (78–114) + Al-Fatiha (1). Add more later if needed.
export const SURAH_CATALOG: Record<number, SurahInfo> = {
  1: { number: 1, name: "Al-Fatiha", arabic: "الفاتحة" },
  78: { number: 78, name: "An-Naba", arabic: "النبأ" },
  79: { number: 79, name: "An-Naziat", arabic: "النازعات" },
  80: { number: 80, name: "Abasa", arabic: "عبس" },
  81: { number: 81, name: "At-Takwir", arabic: "التكوير" },
  82: { number: 82, name: "Al-Infitar", arabic: "الانفطار" },
  83: { number: 83, name: "Al-Mutaffifin", arabic: "المطففين" },
  84: { number: 84, name: "Al-Inshiqaq", arabic: "الانشقاق" },
  85: { number: 85, name: "Al-Buruj", arabic: "البروج" },
  86: { number: 86, name: "At-Tariq", arabic: "الطارق" },
  87: { number: 87, name: "Al-Ala", arabic: "الأعلى" },
  88: { number: 88, name: "Al-Ghashiyah", arabic: "الغاشية" },
  89: { number: 89, name: "Al-Fajr", arabic: "الفجر" },
  90: { number: 90, name: "Al-Balad", arabic: "البلد" },
  91: { number: 91, name: "Ash-Shams", arabic: "الشمس" },
  92: { number: 92, name: "Al-Layl", arabic: "الليل" },
  93: { number: 93, name: "Ad-Duha", arabic: "الضحى" },
  94: { number: 94, name: "Al-Inshirah", arabic: "الشرح" },
  95: { number: 95, name: "At-Tin", arabic: "التين" },
  96: { number: 96, name: "Al-Alaq", arabic: "العلق" },
  97: { number: 97, name: "Al-Qadr", arabic: "القدر" },
  98: { number: 98, name: "Al-Bayyinah", arabic: "البيّنة" },
  99: { number: 99, name: "Az-Zalzalah", arabic: "الزلزلة" },
  100: { number: 100, name: "Al-Adiyat", arabic: "العاديات" },
  101: { number: 101, name: "Al-Qariah", arabic: "القارعة" },
  102: { number: 102, name: "At-Takathur", arabic: "التكاثر" },
  103: { number: 103, name: "Al-Asr", arabic: "العصر" },
  104: { number: 104, name: "Al-Humazah", arabic: "الهمزة" },
  105: { number: 105, name: "Al-Fil", arabic: "الفيل" },
  106: { number: 106, name: "Quraysh", arabic: "قريش" },
  107: { number: 107, name: "Al-Maun", arabic: "الماعون" },
  108: { number: 108, name: "Al-Kawthar", arabic: "الكوثر" },
  109: { number: 109, name: "Al-Kafirun", arabic: "الكافرون" },
  110: { number: 110, name: "An-Nasr", arabic: "النصر" },
  111: { number: 111, name: "Al-Masad", arabic: "المسد" },
  112: { number: 112, name: "Al-Ikhlas", arabic: "الإخلاص" },
  113: { number: 113, name: "Al-Falaq", arabic: "الفلق" },
  114: { number: 114, name: "An-Nas", arabic: "الناس" },
};

export const JUZ_30_NUMBERS = Object.keys(SURAH_CATALOG)
  .map(Number)
  .filter((n) => n >= 78 && n <= 114)
  .sort((a, b) => a - b);

