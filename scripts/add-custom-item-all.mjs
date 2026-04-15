const API_BASE = process.env.API_BASE || "https://memorizationtracker.pages.dev";
const TITLE = process.argv[2] || "Dua e Qunoot";

async function api(path, init) {
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function main() {
  const students = await api("/api/students", { method: "GET" });
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const s of students) {
    const already = (s.customItems || []).some((ci) => (ci.title || "").toLowerCase() === TITLE.toLowerCase());
    if (already) {
      skipped++;
      continue;
    }
    try {
      await api("/api/custom-items", {
        method: "POST",
        body: JSON.stringify({ studentId: s.id, title: TITLE }),
      });
      ok++;
    } catch (e) {
      // If it already exists due to race/unique constraint, treat as skipped
      if (String(e?.message || "").toLowerCase().includes("unique")) {
        skipped++;
      } else {
        failed++;
        // eslint-disable-next-line no-console
        console.error(`Failed for ${s.name}:`, e?.message || e);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ title: TITLE, students: students.length, added: ok, skipped, failed }));
  if (failed) process.exit(1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

