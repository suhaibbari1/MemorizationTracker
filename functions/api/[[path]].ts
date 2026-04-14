type Env = {
  DB: D1Database;
};

type SurahProgressRow = {
  surah_number: number;
  stars: number;
  first_attempt: number;
  attempts: number;
};

type CustomItemRow = {
  id: string;
  title: string;
  stars: number;
  first_attempt: number;
  attempts: number;
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers || {}),
    },
    ...init,
  });
}

function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

function notFound() {
  return json({ error: "Not found" }, { status: 404 });
}

function uuidLike() {
  // good-enough for our use: crypto.randomUUID() is available in Workers
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

async function readJson<T>(req: Request): Promise<T> {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error("Expected application/json");
  return (await req.json()) as T;
}

async function loadAllStudentData(db: D1Database) {
  const students = await db
    .prepare("SELECT id, name FROM students ORDER BY name")
    .all<{ id: string; name: string }>();

  const progressRows = await db
    .prepare("SELECT student_id, surah_number, stars, first_attempt, attempts FROM surah_progress")
    .all<{ student_id: string } & SurahProgressRow>();

  const customRows = await db
    .prepare("SELECT id, student_id, title, stars, first_attempt, attempts FROM custom_items")
    .all<{ student_id: string } & CustomItemRow>();

  const byStudentProgress = new Map<string, Record<number, { stars: number; firstAttempt: boolean; attempts: number }>>();
  for (const p of (progressRows.results || [])) {
    const cur = byStudentProgress.get(p.student_id) || {};
    cur[p.surah_number] = { stars: p.stars, firstAttempt: !!p.first_attempt, attempts: p.attempts };
    byStudentProgress.set(p.student_id, cur);
  }

  const byStudentCustom = new Map<string, { id: string; title: string; stars: number; firstAttempt: boolean; attempts: number }[]>();
  for (const ci of (customRows.results || [])) {
    const arr = byStudentCustom.get(ci.student_id) || [];
    arr.push({ id: ci.id, title: ci.title, stars: ci.stars, firstAttempt: !!ci.first_attempt, attempts: ci.attempts });
    byStudentCustom.set(ci.student_id, arr);
  }
  for (const [k, arr] of byStudentCustom) arr.sort((a, b) => a.title.localeCompare(b.title));

  return (students.results || []).map((s) => ({
    id: s.id,
    name: s.name,
    progress: byStudentProgress.get(s.id) || {},
    customItems: byStudentCustom.get(s.id) || [],
  }));
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // Path handling: /api/* is routed here; use the remainder.
  const raw = url.pathname.replace(/^\/api\/?/, "");
  const path = raw.split("/").filter(Boolean);

  try {
    // GET /api/students
    if (method === "GET" && path.length === 1 && path[0] === "students") {
      const data = await loadAllStudentData(env.DB);
      return json(data);
    }

    // POST /api/students { name }
    if (method === "POST" && path.length === 1 && path[0] === "students") {
      const body = await readJson<{ name?: string }>(request);
      const name = (body.name || "").trim();
      if (!name) return badRequest("Name is required");

      const id = uuidLike();
      const res = await env.DB
        .prepare("INSERT INTO students (id, name) VALUES (?, ?)")
        .bind(id, name)
        .run();

      if (res.success) return json({ id });
      return json({ error: "Failed to insert student" }, { status: 500 });
    }

    // DELETE /api/students/:id
    if (method === "DELETE" && path.length === 2 && path[0] === "students") {
      const id = path[1];
      await env.DB.prepare("DELETE FROM students WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    // GET /api/student/:id
    if (method === "GET" && path.length === 2 && path[0] === "student") {
      const id = path[1];
      const s = await env.DB.prepare("SELECT id, name FROM students WHERE id = ?").bind(id).first<{ id: string; name: string }>();
      if (!s) return notFound();

      const p = await env.DB
        .prepare("SELECT surah_number, stars, first_attempt, attempts FROM surah_progress WHERE student_id = ?")
        .bind(id)
        .all<SurahProgressRow>();

      const ci = await env.DB
        .prepare("SELECT id, title, stars, first_attempt, attempts FROM custom_items WHERE student_id = ? ORDER BY title")
        .bind(id)
        .all<CustomItemRow>();

      const progress: Record<number, { stars: number; firstAttempt: boolean; attempts: number }> = {};
      for (const row of (p.results || [])) {
        progress[row.surah_number] = { stars: row.stars, firstAttempt: !!row.first_attempt, attempts: row.attempts };
      }

      return json({
        id: s.id,
        name: s.name,
        progress,
        customItems: (ci.results || []).map((x) => ({
          id: x.id,
          title: x.title,
          stars: x.stars,
          firstAttempt: !!x.first_attempt,
          attempts: x.attempts,
        })),
      });
    }

    // POST /api/progress/surah { studentId, surahNumber, stars, firstAttempt, attempts }
    if (method === "POST" && path.length === 2 && path[0] === "progress" && path[1] === "surah") {
      const body = await readJson<{
        studentId?: string;
        surahNumber?: number;
        stars?: number;
        firstAttempt?: boolean;
        attempts?: number;
      }>(request);

      const studentId = body.studentId || "";
      const surahNumber = Number(body.surahNumber);
      const stars = Number(body.stars);
      const attempts = Number(body.attempts);
      const firstAttempt = !!body.firstAttempt;

      if (!studentId) return badRequest("studentId is required");
      if (!Number.isFinite(surahNumber)) return badRequest("surahNumber is required");
      if (!Number.isFinite(stars)) return badRequest("stars is required");
      if (!Number.isFinite(attempts)) return badRequest("attempts is required");

      const id = uuidLike();
      await env.DB
        .prepare(
          `INSERT INTO surah_progress (id, student_id, surah_number, stars, first_attempt, attempts, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(student_id, surah_number)
           DO UPDATE SET stars=excluded.stars, first_attempt=excluded.first_attempt, attempts=excluded.attempts, updated_at=excluded.updated_at`
        )
        .bind(id, studentId, surahNumber, stars, firstAttempt ? 1 : 0, attempts, nowIso())
        .run();

      return json({ ok: true });
    }

    // DELETE /api/progress/surah?studentId=...&surahNumber=...
    if (method === "DELETE" && path.length === 2 && path[0] === "progress" && path[1] === "surah") {
      const studentId = url.searchParams.get("studentId") || "";
      const surahNumber = Number(url.searchParams.get("surahNumber"));
      if (!studentId) return badRequest("studentId is required");
      if (!Number.isFinite(surahNumber)) return badRequest("surahNumber is required");

      await env.DB
        .prepare("DELETE FROM surah_progress WHERE student_id = ? AND surah_number = ?")
        .bind(studentId, surahNumber)
        .run();
      return json({ ok: true });
    }

    // POST /api/custom-items { studentId, title }
    if (method === "POST" && path.length === 1 && path[0] === "custom-items") {
      const body = await readJson<{ studentId?: string; title?: string }>(request);
      const studentId = body.studentId || "";
      const title = (body.title || "").trim();
      if (!studentId) return badRequest("studentId is required");
      if (!title) return badRequest("title is required");

      const id = uuidLike();
      await env.DB
        .prepare("INSERT INTO custom_items (id, student_id, title) VALUES (?, ?, ?)")
        .bind(id, studentId, title)
        .run();
      return json({ id });
    }

    // PATCH /api/custom-items/:id { stars, firstAttempt, attempts }
    if (method === "PATCH" && path.length === 2 && path[0] === "custom-items") {
      const id = path[1];
      const body = await readJson<{ stars?: number; firstAttempt?: boolean; attempts?: number }>(request);
      const stars = Number(body.stars);
      const attempts = Number(body.attempts);
      const firstAttempt = !!body.firstAttempt;
      if (!Number.isFinite(stars)) return badRequest("stars is required");
      if (!Number.isFinite(attempts)) return badRequest("attempts is required");

      await env.DB
        .prepare("UPDATE custom_items SET stars=?, first_attempt=?, attempts=?, updated_at=? WHERE id=?")
        .bind(stars, firstAttempt ? 1 : 0, attempts, nowIso(), id)
        .run();
      return json({ ok: true });
    }

    // DELETE /api/custom-items/:id
    if (method === "DELETE" && path.length === 2 && path[0] === "custom-items") {
      const id = path[1];
      await env.DB.prepare("DELETE FROM custom_items WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    // POST /api/import { students: [{ name, progress, customItems }] }
    if (method === "POST" && path.length === 1 && path[0] === "import") {
      const body = await readJson<{
        students?: {
          name: string;
          progress: Record<string, { stars: number; firstAttempt: boolean; attempts: number }>;
          customItems?: { title: string; stars: number; firstAttempt: boolean; attempts: number }[];
        }[];
      }>(request);

      const list = body.students || [];
      if (!Array.isArray(list)) return badRequest("students must be an array");

      // Map existing students by name
      const existing = await env.DB.prepare("SELECT id, name FROM students").all<{ id: string; name: string }>();
      const nameToId = new Map((existing.results || []).map((s) => [s.name, s.id]));

      const statements: D1PreparedStatement[] = [];
      for (const s of list) {
        const name = (s.name || "").trim();
        if (!name) continue;
        let id = nameToId.get(name);
        if (!id) {
          id = uuidLike();
          nameToId.set(name, id);
          statements.push(env.DB.prepare("INSERT INTO students (id, name) VALUES (?, ?)").bind(id, name));
        }

        for (const [surahNumStr, p] of Object.entries(s.progress || {})) {
          const surahNumber = Number(surahNumStr);
          if (!Number.isFinite(surahNumber)) continue;
          const rowId = uuidLike();
          statements.push(
            env.DB
              .prepare(
                `INSERT INTO surah_progress (id, student_id, surah_number, stars, first_attempt, attempts, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(student_id, surah_number)
                 DO UPDATE SET stars=excluded.stars, first_attempt=excluded.first_attempt, attempts=excluded.attempts, updated_at=excluded.updated_at`
              )
              .bind(rowId, id, surahNumber, p.stars ?? 0, p.firstAttempt ? 1 : 0, p.attempts ?? 0, nowIso())
          );
        }

        for (const ci of s.customItems || []) {
          const title = (ci.title || "").trim();
          if (!title) continue;
          const rowId = uuidLike();
          statements.push(
            env.DB
              .prepare(
                `INSERT INTO custom_items (id, student_id, title, stars, first_attempt, attempts, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(student_id, title)
                 DO UPDATE SET stars=excluded.stars, first_attempt=excluded.first_attempt, attempts=excluded.attempts, updated_at=excluded.updated_at`
              )
              .bind(rowId, id, title, ci.stars ?? 0, ci.firstAttempt ? 1 : 0, ci.attempts ?? 0, nowIso())
          );
        }
      }

      // Execute in chunks
      const chunkSize = 50;
      for (let i = 0; i < statements.length; i += chunkSize) {
        // eslint-disable-next-line no-await-in-loop
        await env.DB.batch(statements.slice(i, i + chunkSize));
      }
      return json({ ok: true });
    }

    return notFound();
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, { status: 500 });
  }
};

