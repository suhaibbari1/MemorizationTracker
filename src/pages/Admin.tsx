import { useEffect, useMemo, useState } from "react";
import { addGrade, deleteGrade, loadGrades, type Grade } from "@/lib/grades";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  const sorted = useMemo(() => {
    return [...grades].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label));
  }, [grades]);

  async function refresh() {
    try {
      setLoading(true);
      const data = await loadGrades();
      setGrades(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const onAdd = async () => {
    const c = code.trim();
    const l = label.trim();
    if (!c || !l) return;
    try {
      await addGrade({ code: c, label: l, sortOrder });
      toast.success(`Added ${l}`);
      setCode("");
      setLabel("");
      setSortOrder(0);
      refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to add grade");
    }
  };

  const onDelete = async (g: Grade) => {
    if (!confirm(`Remove grade "${g.label}"? (Students will still exist, but this grade may disappear from the UI list.)`)) return;
    try {
      await deleteGrade(g.id);
      toast.success(`Removed ${g.label}`);
      refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to remove grade");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="font-semibold text-sm">Back</span>
          </button>
          <div className="mt-2">
            <h1 className="text-xl font-extrabold font-sans text-foreground leading-tight">Admin</h1>
            <p className="text-xs text-muted-foreground">Manage grades shown in the app.</p>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Add grade</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder='Code (e.g. "5th")'
              className="px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='Label (e.g. "5th Grade")'
              className="px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
            <input
              value={Number.isFinite(sortOrder) ? String(sortOrder) : "0"}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              placeholder="Sort order"
              className="px-3 py-2 rounded-md border border-border bg-background text-sm"
              inputMode="numeric"
            />
          </div>
          <div className="mt-3">
            <button
              onClick={onAdd}
              disabled={!code.trim() || !label.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              <Plus size={16} />
              Add grade
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Grades</h2>
            <span className="text-xs text-muted-foreground">{grades.length} total</span>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="mt-3 grid gap-2">
              {sorted.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-md border border-border bg-background p-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{g.label}</div>
                    <div className="text-xs text-muted-foreground">
                      code: <span className="font-mono">{g.code}</span> · sort: {g.sort_order ?? 0}
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(g)}
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove grade"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;

