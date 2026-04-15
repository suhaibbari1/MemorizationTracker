type Env = {
  DB: D1Database;
};

type GradeRow = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
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

type GradeSurahRow = {
  id: string;
  grade_code: string;
  surah_number: number;
  sort_order: number;
};

async function ensureGradeSurahsTable(db: D1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS grade_surahs (id TEXT PRIMARY KEY, grade_code TEXT NOT NULL, surah_number INTEGER NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE (grade_code, surah_number))"
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_grade_surahs_grade_sort ON grade_surahs(grade_code, sort_order, surah_number)"),
  ]);
}

async function seedDefaultSurahsForGrade(db: D1Database, gradeCode: string) {
  await ensureGradeSurahsTable(db);

  // Try to copy from 4th grade if it exists
  const copied = await db
    .prepare(
      "INSERT OR IGNORE INTO grade_surahs (id, grade_code, surah_number, sort_order) " +
        "SELECT ('gs-' || ? || '-' || surah_number) as id, ? as grade_code, surah_number, sort_order " +
        "FROM grade_surahs WHERE grade_code = '4th'"
    )
    .bind(gradeCode, gradeCode)
    .run();

  // If nothing copied, fall back to the default last-21 (114..94)
  if ((copied.changes || 0) === 0) {
    const stmts: D1PreparedStatement[] = [];
    let order = 10;
    for (let n = 114; n >= 94; n--) {
      stmts.push(
        db.prepare("INSERT OR IGNORE INTO grade_surahs (id, grade_code, surah_number, sort_order) VALUES (?, ?, ?, ?)")
          .bind(`gs-${gradeCode}-${n}`, gradeCode, n, order)
      );
      order += 10;
    }
    await db.batch(stmts);
  }
}

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
  // Support both old schema (no grade column) and new schema (grade)
  let students:
    | D1Result<{ id: string; name: string; grade?: string }>
    | undefined;
  try {
    students = await db
      .prepare("SELECT id, name, grade FROM students ORDER BY name")
      .all<{ id: string; name: string; grade: string }>();
  } catch {
    students = await db
      .prepare("SELECT id, name FROM students ORDER BY name")
      .all<{ id: string; name: string }>();
  }

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
    grade: (s as any).grade || "4th",
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
    // GET /api/grades
    if (method === "GET" && path.length === 1 && path[0] === "grades") {
      // Support old DBs (no grades table yet)
      try {
        const rows = await env.DB
          .prepare("SELECT id, code, label, sort_order FROM grades ORDER BY sort_order ASC, label ASC")
          .all<GradeRow>();
        return json(rows.results || []);
      } catch {
        return json([
          { id: "grade-3rd", code: "3rd", label: "3rd Grade", sort_order: 30 },
          { id: "grade-4th", code: "4th", label: "4th Grade", sort_order: 40 },
        ]);
      }
    }

    // POST /api/grades { code, label, sortOrder? }
    if (method === "POST" && path.length === 1 && path[0] === "grades") {
      const body = await readJson<{ code?: string; label?: string; sortOrder?: number }>(request);
      const code = (body.code || "").trim();
      const label = (body.label || "").trim();
      const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
      if (!code) return badRequest("code is required");
      if (!label) return badRequest("label is required");

      // Ensure table exists (in case migration hasn't run yet)
      await env.DB.batch([
        env.DB.prepare(
          "CREATE TABLE IF NOT EXISTS grades (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))"
        ),
        env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_grades_sort ON grades(sort_order, label)"),
      ]);

      const id = uuidLike();
      await env.DB
        .prepare("INSERT INTO grades (id, code, label, sort_order) VALUES (?, ?, ?, ?)")
        .bind(id, code, label, sortOrder)
        .run();

      // Initialize surah list for this grade (copy from 4th if possible)
      try {
        await seedDefaultSurahsForGrade(env.DB, code);
      } catch (e) {
        // Non-fatal: grade can still be configured manually in admin UI
        console.error("Failed to seed grade_surahs for", code, e);
      }
      return json({ id });
    }

    // DELETE /api/grades/:id
    if (method === "DELETE" && path.length === 2 && path[0] === "grades") {
      const id = path[1];
      await env.DB.prepare("DELETE FROM grades WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    // PATCH /api/grades/:id { code?, label?, sortOrder? }
    if (method === "PATCH" && path.length === 2 && path[0] === "grades") {
      const id = path[1];
      const body = await readJson<{ code?: string; label?: string; sortOrder?: number }>(request);
      const updates: string[] = [];
      const binds: any[] = [];

      if (typeof body.code === "string") {
        const code = body.code.trim();
        if (!code) return badRequest("code cannot be empty");
        updates.push("code = ?");
        binds.push(code);
      }
      if (typeof body.label === "string") {
        const label = body.label.trim();
        if (!label) return badRequest("label cannot be empty");
        updates.push("label = ?");
        binds.push(label);
      }
      if (body.sortOrder !== undefined) {
        const sortOrder = Number(body.sortOrder);
        if (!Number.isFinite(sortOrder)) return badRequest("sortOrder must be a number");
        updates.push("sort_order = ?");
        binds.push(sortOrder);
      }

      if (updates.length === 0) return badRequest("No fields to update");

      binds.push(id);
      await env.DB
        .prepare(`UPDATE grades SET ${updates.join(", ")} WHERE id = ?`)
        .bind(...binds)
        .run();

      return json({ ok: true });
    }

    // POST /api/grades/reorder { ids: string[] }
    if (method === "POST" && path.length === 2 && path[0] === "grades" && path[1] === "reorder") {
      const body = await readJson<{ ids?: string[] }>(request);
      const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string" && x.trim()) : [];
      if (ids.length === 0) return badRequest("ids is required");

      const stmts: D1PreparedStatement[] = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const sortOrder = (i + 1) * 10;
        stmts.push(env.DB.prepare("UPDATE grades SET sort_order = ? WHERE id = ?").bind(sortOrder, id));
      }
      await env.DB.batch(stmts);
      return json({ ok: true });
    }

    // GET /api/students
    if (method === "GET" && path.length === 1 && path[0] === "students") {
      const grade = url.searchParams.get("grade");
      const data = await loadAllStudentData(env.DB);
      if (!grade) return json(data);
      return json(data.filter((s: any) => String(s.grade || "4th") === grade));
    }

    // GET /api/grade-surahs?grade=4th
    if (method === "GET" && path.length === 1 && path[0] === "grade-surahs") {
      const grade = url.searchParams.get("grade") || "";
      if (!grade) return badRequest("grade is required");
      // Support DBs before migration
      try {
        const rows = await env.DB
          .prepare("SELECT id, grade_code, surah_number, sort_order FROM grade_surahs WHERE grade_code = ? ORDER BY sort_order ASC, surah_number DESC")
          .bind(grade)
          .all<GradeSurahRow>();
        return json(rows.results || []);
      } catch {
        return json([]);
      }
    }

    // POST /api/grade-surahs { grade, surahNumber }
    if (method === "POST" && path.length === 1 && path[0] === "grade-surahs") {
      const body = await readJson<{ grade?: string; surahNumber?: number }>(request);
      const grade = (body.grade || "").trim();
      const surahNumber = Number(body.surahNumber);
      if (!grade) return badRequest("grade is required");
      if (!Number.isFinite(surahNumber)) return badRequest("surahNumber is required");

      // Ensure table exists (in case migration hasn't run yet)
      await env.DB.batch([
        env.DB.prepare(
          "CREATE TABLE IF NOT EXISTS grade_surahs (id TEXT PRIMARY KEY, grade_code TEXT NOT NULL, surah_number INTEGER NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE (grade_code, surah_number))"
        ),
        env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_grade_surahs_grade_sort ON grade_surahs(grade_code, sort_order, surah_number)"),
      ]);

      const id = uuidLike();
      // place at end
      const max = await env.DB
        .prepare("SELECT COALESCE(MAX(sort_order), 0) as m FROM grade_surahs WHERE grade_code = ?")
        .bind(grade)
        .first<{ m: number }>();
      const sortOrder = (Number(max?.m || 0) || 0) + 10;

      await env.DB
        .prepare("INSERT INTO grade_surahs (id, grade_code, surah_number, sort_order) VALUES (?, ?, ?, ?)")
        .bind(id, grade, surahNumber, sortOrder)
        .run();
      return json({ id });
    }

    // DELETE /api/grade-surahs/:id
    if (method === "DELETE" && path.length === 2 && path[0] === "grade-surahs") {
      const id = path[1];
      await env.DB.prepare("DELETE FROM grade_surahs WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    // POST /api/grade-surahs/reorder { grade, ids: string[] }
    if (method === "POST" && path.length === 2 && path[0] === "grade-surahs" && path[1] === "reorder") {
      const body = await readJson<{ grade?: string; ids?: string[] }>(request);
      const grade = (body.grade || "").trim();
      const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string" && x.trim()) : [];
      if (!grade) return badRequest("grade is required");
      if (ids.length === 0) return badRequest("ids is required");

      const stmts: D1PreparedStatement[] = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const sortOrder = (i + 1) * 10;
        stmts.push(env.DB.prepare("UPDATE grade_surahs SET sort_order = ? WHERE id = ? AND grade_code = ?").bind(sortOrder, id, grade));
      }
      await env.DB.batch(stmts);
      return json({ ok: true });
    }

    // POST /api/students { name }
    if (method === "POST" && path.length === 1 && path[0] === "students") {
      const body = await readJson<{ name?: string; grade?: string }>(request);
      const name = (body.name || "").trim();
      if (!name) return badRequest("Name is required");
      const grade = (body.grade || "4th").trim() || "4th";

      const id = uuidLike();
      let res: D1Result | undefined;
      try {
        res = await env.DB
          .prepare("INSERT INTO students (id, name, grade) VALUES (?, ?, ?)")
          .bind(id, name, grade)
          .run();
      } catch {
        // Old schema fallback (no grade column)
        res = await env.DB
          .prepare("INSERT INTO students (id, name) VALUES (?, ?)")
          .bind(id, name)
          .run();
      }

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
      let s: { id: string; name: string; grade?: string } | null = null;
      try {
        s = await env.DB
          .prepare("SELECT id, name, grade FROM students WHERE id = ?")
          .bind(id)
          .first<{ id: string; name: string; grade: string }>();
      } catch {
        s = await env.DB.prepare("SELECT id, name FROM students WHERE id = ?").bind(id).first<{ id: string; name: string }>();
      }
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
        grade: (s as any).grade || "4th",
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
          grade?: string;
          progress: Record<string, { stars: number; firstAttempt: boolean; attempts: number }>;
          customItems?: { title: string; stars: number; firstAttempt: boolean; attempts: number }[];
        }[];
      }>(request);

      const list = body.students || [];
      if (!Array.isArray(list)) return badRequest("students must be an array");

      // Map existing students by name
      let existing:
        | D1Result<{ id: string; name: string; grade?: string }>
        | undefined;
      let hasGrade = true;
      try {
        existing = await env.DB
          .prepare("SELECT id, name, grade FROM students")
          .all<{ id: string; name: string; grade: string }>();
      } catch {
        hasGrade = false;
        existing = await env.DB.prepare("SELECT id, name FROM students").all<{ id: string; name: string }>();
      }
      const nameToId = new Map((existing.results || []).map((s) => [s.name, s.id]));

      const statements: D1PreparedStatement[] = [];
      for (const s of list) {
        const name = (s.name || "").trim();
        if (!name) continue;
        let id = nameToId.get(name);
        if (!id) {
          id = uuidLike();
          nameToId.set(name, id);
          const grade = (s.grade || "4th").trim() || "4th";
          if (hasGrade) {
            statements.push(env.DB.prepare("INSERT INTO students (id, name, grade) VALUES (?, ?, ?)").bind(id, name, grade));
          } else {
            statements.push(env.DB.prepare("INSERT INTO students (id, name) VALUES (?, ?)").bind(id, name));
          }
        } else if (hasGrade && s.grade) {
          // Keep grade up to date if provided
          const grade = s.grade.trim() || "4th";
          statements.push(env.DB.prepare("UPDATE students SET grade=? WHERE id=?").bind(grade, id));
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

