import { useEffect, useState } from "react";
import { addGrade, deleteGrade, loadGrades, reorderGrades, updateGrade, type Grade } from "@/lib/grades";
import { toast } from "sonner";
import { ArrowLeft, Check, GripVertical, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dirtyOrder, setDirtyOrder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editSortOrder, setEditSortOrder] = useState<number>(0);

  async function refresh() {
    try {
      setLoading(true);
      const data = await loadGrades();
      // Keep in the same order returned by API (already sorted by sort_order)
      setGrades(data);
      setDirtyOrder(false);
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

  const move = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setGrades((prev) => {
      const fromIdx = prev.findIndex((g) => g.id === fromId);
      const toIdx = prev.findIndex((g) => g.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
    setDirtyOrder(true);
  };

  const saveOrder = async () => {
    try {
      await reorderGrades(grades.map((g) => g.id));
      toast.success("Grade order saved");
      setDirtyOrder(false);
      refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save order");
    }
  };

  const startEdit = (g: Grade) => {
    setEditingId(g.id);
    setEditCode(g.code);
    setEditLabel(g.label);
    setEditSortOrder(g.sort_order ?? 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCode("");
    setEditLabel("");
    setEditSortOrder(0);
  };

  const saveEdit = async (g: Grade) => {
    try {
      await updateGrade(g.id, {
        code: editCode.trim(),
        label: editLabel.trim(),
        sortOrder: editSortOrder,
      });
      toast.success("Grade updated");
      cancelEdit();
      refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update grade");
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{grades.length} total</span>
              <button
                onClick={saveOrder}
                disabled={!dirtyOrder || grades.length === 0}
                className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                title="Save grade order"
              >
                <Save size={14} />
                Save order
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="mt-3 grid gap-2">
              {grades.map((g) => (
                <div
                  key={g.id}
                  draggable={editingId !== g.id}
                  onDragStart={() => setDragId(g.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (!dragId) return;
                    move(dragId, g.id);
                    setDragId(null);
                  }}
                  className={`flex items-center justify-between rounded-md border p-3 ${
                    dragId === g.id ? "border-primary/50 bg-primary/5" : "border-border bg-background"
                  }`}
                  title="Drag to reorder"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical size={16} className="text-muted-foreground shrink-0" />
                    {editingId === g.id ? (
                      <div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-3">
                        <input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="px-2 py-1 rounded-md border border-border bg-background text-sm"
                          placeholder="Code"
                        />
                        <input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="px-2 py-1 rounded-md border border-border bg-background text-sm"
                          placeholder="Label"
                        />
                        <input
                          value={Number.isFinite(editSortOrder) ? String(editSortOrder) : "0"}
                          onChange={(e) => setEditSortOrder(Number(e.target.value))}
                          className="px-2 py-1 rounded-md border border-border bg-background text-sm"
                          placeholder="Sort"
                          inputMode="numeric"
                        />
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">{g.label}</div>
                        <div className="text-xs text-muted-foreground">
                          code: <span className="font-mono">{g.code}</span> · sort: {g.sort_order ?? 0}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingId === g.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(g)}
                          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Save changes"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(g)}
                          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Edit grade"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(g)}
                          className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remove grade"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
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

