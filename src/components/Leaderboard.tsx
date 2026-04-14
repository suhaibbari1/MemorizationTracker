import { CustomItemProgress, StudentData, getStudentStats, SurahProgress, SURAHS } from "@/lib/data";
import { Trophy, Medal, Award, Star, Download, Upload, FileSpreadsheet } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { apiFetch } from "@/lib/api";

interface LeaderboardProps {
  students: StudentData[];
  onDataImported: () => void;
}

export function Leaderboard({ students, onDataImported }: LeaderboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const studentsWithStats = students.map(student => ({
    ...student,
    stats: getStudentStats(student)
  }));

  const totalStars = studentsWithStats.reduce((sum, student) => sum + student.stats.totalStars, 0);

  const sortedStudents = [...studentsWithStats].sort((a, b) => {
    if (b.stats.totalStars !== a.stats.totalStars) return b.stats.totalStars - a.stats.totalStars;
    if (b.stats.completed !== a.stats.completed) return b.stats.completed - a.stats.completed;
    return b.stats.firstAttemptPerfect - a.stats.firstAttemptPerfect;
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="text-primary" size={20} />;
      case 1: return <Medal className="text-muted-foreground" size={20} />;
      case 2: return <Award className="text-accent" size={20} />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  const handleExport = () => {
    const exportData = students.map(s => ({
      name: s.name,
      progress: s.progress,
      customItems: s.customItems,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wise-quran-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleExportExcel = () => {
    const alphabeticalStudents = [...studentsWithStats].sort((a, b) => a.name.localeCompare(b.name));
    // Rows = surahs, Columns = students (transposed)
    const rows: Record<string, string | number>[] = SURAHS.map(surah => {
      const row: Record<string, string | number> = { Surah: `${surah.number}. ${surah.name}` };
      for (const student of alphabeticalStudents) {
        const p = student.progress[surah.number];
        row[student.name] = p ? p.stars : 0;
      }
      return row;
    });

    // Add totals row
    const totalsRow: Record<string, string | number> = { Surah: "Total Stars" };
    for (const student of alphabeticalStudents) {
      totalsRow[student.name] = student.stats.totalStars;
    }
    rows.push(totalsRow);

    const completedRow: Record<string, string | number> = { Surah: "Completed" };
    for (const student of alphabeticalStudents) {
      completedRow[student.name] = student.stats.completed;
    }
    rows.push(completedRow);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Progress");
    XLSX.writeFile(wb, `wise-quran-progress-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel exported successfully");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported: {
        name: string;
        progress: Record<number, SurahProgress>;
        customItems?: CustomItemProgress[];
      }[] = JSON.parse(text);

      if (!Array.isArray(imported)) throw new Error("Invalid format");
      await apiFetch<{ ok: true }>("/api/import", {
        method: "POST",
        body: JSON.stringify({ students: imported }),
      });

      toast.success("Data imported successfully");
      onDataImported();
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Import failed. Please check the file format.");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Class Overview */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Star className="text-primary" size={24} />
          Class Overview
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-primary">{totalStars}</div>
            <div className="text-sm text-muted-foreground">Total Stars Earned</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-primary">{students.length}</div>
            <div className="text-sm text-muted-foreground">Active Students</div>
          </div>
        </div>
      </div>

      {/* Export / Import */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleExportExcel}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <FileSpreadsheet size={16} />
          Export Excel
        </button>
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Download size={16} />
          Export JSON
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Upload size={16} />
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Leaderboard */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        <div className="space-y-3">
          {sortedStudents.map((student, index) => (
            <div
              key={student.name}
              className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
            >
              <div className="flex items-center gap-3">
                {getRankIcon(index)}
                <div>
                  <div className="font-semibold">{student.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {student.stats.completed}/{student.stats.total} completed
                    {student.stats.firstAttemptPerfect > 0 && (
                      <span className="ml-2 text-accent">• {student.stats.firstAttemptPerfect} first-try perfect</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{student.stats.totalStars}</div>
                <div className="text-xs text-muted-foreground">stars</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
