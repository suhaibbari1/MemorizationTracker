import { useState, useEffect, useCallback } from "react";
import {
  addCustomItem,
  addStudent,
  deleteCustomItem,
  deleteStudent,
  deleteSurahProgress,
  loadData,
  StudentData,
  updateCustomItemProgress,
  upsertSurahProgress,
} from "@/lib/data";
import { toast } from "sonner";
import { StudentCard } from "@/components/StudentCard";
import { StudentDetail } from "@/components/StudentDetail";
import { Leaderboard } from "@/components/Leaderboard";
import { Users, BarChart3, Loader2, Plus, Trash2 } from "lucide-react";
import { useSwipe } from "@/hooks/use-swipe";
import wiseLogo from "@/assets/wise-logo.jpg";

const Index = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [view, setView] = useState<'students' | 'report'>('students');
  const [loading, setLoading] = useState(true);
  const [newStudentName, setNewStudentName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [grade, setGrade] = useState<"3rd" | "4th">("4th");

  const fetchData = useCallback(async () => {
    try {
      const data = await loadData(grade);
      setStudents(data);
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error("Backend not reachable. Set VITE_API_BASE or run via Cloudflare Pages dev.");
    } finally {
      setLoading(false);
    }
  }, [grade]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateSurah = async (studentIdx: number, surahNumber: number, stars: number) => {
    const student = students[studentIdx];
    const existing = student.progress[surahNumber];
    const attempts = existing ? existing.attempts + 1 : 1;
    const firstAttempt = attempts === 1 && stars === 5;

    // Optimistic update
    setStudents((prev) => {
      const updated = [...prev];
      const s = { ...updated[studentIdx] };
      s.progress = { ...s.progress, [surahNumber]: { stars, firstAttempt, attempts } };
      updated[studentIdx] = s;
      return updated;
    });

    try {
      await upsertSurahProgress(student.id, surahNumber, stars, firstAttempt, attempts);
    } catch (err) {
      console.error("Failed to save progress:", err);
      fetchData(); // rollback
    }
  };

  const handleAddCustomItem = async (studentIdx: number, title: string) => {
    const student = students[studentIdx];
    const trimmed = title.trim();
    if (!trimmed) return;

    // optimistic: show immediately (temp id, will refresh after save)
    setStudents((prev) => {
      const updated = [...prev];
      const s = { ...updated[studentIdx] };
      s.customItems = [
        ...s.customItems,
        { id: `temp:${Date.now()}`, title: trimmed, stars: 0, firstAttempt: true, attempts: 0 },
      ].sort((a, b) => a.title.localeCompare(b.title));
      updated[studentIdx] = s;
      return updated;
    });

    try {
      await addCustomItem(student.id, trimmed);
      toast.success(`Added "${trimmed}"`);
      fetchData();
    } catch (err: any) {
      console.error("Failed to add custom item:", err);
      toast.error(err?.message?.includes("custom_items") ? "Custom items not enabled in database yet" : "Failed to add item");
      fetchData();
    }
  };

  const handleUpdateCustomItem = async (studentIdx: number, itemId: string, stars: number) => {
    const student = students[studentIdx];
    const existing = student.customItems.find((ci) => ci.id === itemId);
    const attempts = existing ? existing.attempts + 1 : 1;
    const firstAttempt = attempts === 1 && stars === 5;

    setStudents((prev) => {
      const updated = [...prev];
      const s = { ...updated[studentIdx] };
      s.customItems = s.customItems.map((ci) =>
        ci.id === itemId ? { ...ci, stars, firstAttempt, attempts } : ci
      );
      updated[studentIdx] = s;
      return updated;
    });

    try {
      await updateCustomItemProgress(itemId, stars, firstAttempt, attempts);
    } catch (err) {
      console.error("Failed to update custom item:", err);
      fetchData();
    }
  };

  const handleDeleteCustomItem = async (studentIdx: number, itemId: string, title: string) => {
    if (!confirm(`Remove "${title}"?`)) return;

    setStudents((prev) => {
      const updated = [...prev];
      const s = { ...updated[studentIdx] };
      s.customItems = s.customItems.filter((ci) => ci.id !== itemId);
      updated[studentIdx] = s;
      return updated;
    });

    // If it's an optimistic temp item, just drop it locally
    if (itemId.startsWith("temp:")) return;

    try {
      await deleteCustomItem(itemId);
      toast.success(`Removed "${title}"`);
    } catch (err) {
      console.error("Failed to remove custom item:", err);
      toast.error("Failed to remove item");
      fetchData();
    }
  };

  const handleResetSurah = async (studentIdx: number, surahNumber: number) => {
    const student = students[studentIdx];

    setStudents((prev) => {
      const updated = [...prev];
      const s = { ...updated[studentIdx] };
      const { [surahNumber]: _, ...rest } = s.progress;
      s.progress = rest;
      updated[studentIdx] = s;
      return updated;
    });

    try {
      await deleteSurahProgress(student.id, surahNumber);
    } catch (err) {
      console.error("Failed to reset progress:", err);
      fetchData();
    }
  };

  const handleBulkUpdate = async (studentIdx: number, surahNumbers: number[], stars: number) => {
    const student = students[studentIdx];

    // Optimistic update
    setStudents((prev) => {
      const updated = [...prev];
      const s = { ...updated[studentIdx] };
      const newProgress = { ...s.progress };
      for (const num of surahNumbers) {
        const existing = newProgress[num];
        const attempts = existing ? existing.attempts + 1 : 1;
        const firstAttempt = attempts === 1 && stars === 5;
        newProgress[num] = { stars, firstAttempt, attempts };
      }
      s.progress = newProgress;
      updated[studentIdx] = s;
      return updated;
    });

    try {
      await Promise.all(
        surahNumbers.map((num) => {
          const existing = student.progress[num];
          const attempts = existing ? existing.attempts + 1 : 1;
          const firstAttempt = attempts === 1 && stars === 5;
          return upsertSurahProgress(student.id, num, stars, firstAttempt, attempts);
        })
      );
      toast.success(`Updated ${surahNumbers.length} surahs to ${stars} stars`);
    } catch (err) {
      console.error("Bulk update failed:", err);
      toast.error("Bulk update failed");
      fetchData();
    }
  };

  const handleAddStudent = async () => {
    const name = newStudentName.trim();
    if (!name) return;
    if (students.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Student already exists");
      return;
    }
    try {
      await addStudent(name, grade);
      setNewStudentName("");
      setShowAddForm(false);
      toast.success(`Added ${name}`);
      fetchData();
    } catch (err) {
      console.error("Failed to add student:", err);
      toast.error("Failed to add student");
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName}? This will delete all their progress.`)) return;
    try {
      await deleteStudent(studentId);
      toast.success(`Removed ${studentName}`);
      fetchData();
    } catch (err) {
      console.error("Failed to remove student:", err);
      toast.error("Failed to remove student");
    }
  };

  // Swipe between tabs (Students ↔ Report)
  const tabSwipe = useSwipe({
    onSwipeLeft: () => { if (selectedIndex === null) setView('report'); },
    onSwipeRight: () => { if (selectedIndex === null) setView('students'); },
  });

  // Swipe between students in detail view
  const studentSwipe = useSwipe({
    onSwipeLeft: () => {
      if (selectedIndex !== null && selectedIndex < students.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
    },
    onSwipeRight: () => {
      if (selectedIndex !== null && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={wiseLogo} alt="WISE Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-sans text-foreground leading-tight">
                WISE Sunday School
              </h1>
              <p className="text-xs text-muted-foreground">
                Quran Memorization Tracker
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6" {...(selectedIndex === null ? tabSwipe : studentSwipe)}>
        {selectedIndex === null ? (
          <>
            <div className="mb-6 flex items-center justify-center">
              <div className="flex rounded-lg border border-border bg-background p-1">
                <button
                  onClick={() => setGrade("3rd")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    grade === "3rd"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="3rd Grade"
                >
                  3rd
                </button>
                <button
                  onClick={() => setGrade("4th")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    grade === "4th"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="4th Grade"
                >
                  4th
                </button>
                <button
                  onClick={() => setView('students')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'students'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users size={16} />
                  Students
                </button>
                <button
                  onClick={() => setView('report')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'report'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart3 size={16} />
                  Report
                </button>
              </div>
            </div>

            {view === 'students' ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Students
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{students.length} students</span>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </div>

                {showAddForm && (
                  <div className="mb-4 flex gap-2">
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
                      placeholder="Student name"
                      className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      autoFocus
                    />
                    <button
                      onClick={handleAddStudent}
                      className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {students.map((student, idx) => (
                    <div key={student.id} className="relative group">
                      <StudentCard
                        student={student}
                        onClick={() => setSelectedIndex(idx)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStudent(student.id, student.name);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        title={`Remove ${student.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Leaderboard students={students} onDataImported={fetchData} />
            )}
          </>
        ) : (
          <StudentDetail
            student={students[selectedIndex]}
            onBack={() => setSelectedIndex(null)}
            onUpdateSurah={(surahNumber, stars) =>
              handleUpdateSurah(selectedIndex, surahNumber, stars)
            }
            onResetSurah={(surahNumber) =>
              handleResetSurah(selectedIndex, surahNumber)
            }
            onBulkUpdate={(surahNumbers, stars) =>
              handleBulkUpdate(selectedIndex, surahNumbers, stars)
            }
            onAddCustomItem={(title) => handleAddCustomItem(selectedIndex, title)}
            onUpdateCustomItem={(itemId, stars) => handleUpdateCustomItem(selectedIndex, itemId, stars)}
            onDeleteCustomItem={(itemId, title) => handleDeleteCustomItem(selectedIndex, itemId, title)}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
