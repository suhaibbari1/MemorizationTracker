import XLSX from "xlsx";

const API_BASE = process.env.API_BASE || "https://memorizationtracker.pages.dev";
const FILE = process.argv[2] || "4th Grade Sunday School.xlsx";
const GRADE = process.argv[3] || (FILE.toLowerCase().includes("3rd") ? "3rd" : "4th");
const SHEET = process.argv[4]; // optional

const surahMap = new Map(
  [
    ["nas", 114],
    ["falaq", 113],
    ["ikhlas", 112],
    ["lahab", 111],
    ["masad", 111],
    ["nasr", 110],
    ["kafirun", 109],
    ["kafiroon", 109],
    ["kawthar", 108],
    ["kawther", 108],
    ["maun", 107],
    ["maoon", 107],
    ["quraysh", 106],
    ["quraish", 106],
    ["fil", 105],
    ["feel", 105],
    ["humazah", 104],
    ["asr", 103],
    ["takathur", 102],
    ["takathurh", 102],
    ["qariah", 101],
    ["qari'ah", 101],
    ["adiyat", 100],
    ["zalzalah", 99],
    ["bayyinah", 98],
    ["bayyinnah", 98],
    ["qadr", 97],
    ["alaq", 96],
    ["inshirah", 94],
    ["sharh", 94],
    ["shahr", 94],
    ["tin", 95],
    ["duha", 93],
  ].map(([k, v]) => [k, v])
);

function normSurahName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
}

function asStars(v) {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.trunc(n)));
}

async function main() {
  const wb = XLSX.readFile(FILE);
  const sheetName = SHEET || wb.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found");

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (!rows.length) throw new Error("Sheet is empty");

  const header = rows[0].map((h) => String(h).trim());
  if (!header[0] || header[0].toLowerCase() !== "surah") {
    throw new Error(`Expected first header column to be 'Surah' (got '${header[0]}')`);
  }

  const studentNames = header.slice(1).filter(Boolean);
  const students = studentNames.map((name) => ({ name, grade: GRADE, progress: {}, customItems: [] }));
  const byName = new Map(students.map((s) => [s.name, s]));

  for (const row of rows.slice(1)) {
    const rawSurah = row[0];
    const key = normSurahName(rawSurah);
    if (!key) continue;

    const surahNumber = surahMap.get(key);
    if (!surahNumber) {
      // ignore unknown rows rather than failing the whole import
      // eslint-disable-next-line no-console
      console.warn("Skipping unknown surah row:", rawSurah);
      continue;
    }

    for (let col = 1; col < header.length; col++) {
      const studentName = header[col];
      if (!studentName) continue;
      const stars = asStars(row[col]);
      if (!stars) continue;

      const attempts = 1;
      const firstAttempt = stars === 5;
      const s = byName.get(studentName);
      if (!s) continue;
      s.progress[String(surahNumber)] = { stars, firstAttempt, attempts };
    }
  }

  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const res = await fetch(`${base}/api/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ students }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Import failed (${res.status}): ${text}`);
  // eslint-disable-next-line no-console
  console.log("Import OK:", text || "(no body)");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

