import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CustomItemProgress, SURAHS, SurahProgress, StudentData, getStudentStats } from "@/lib/data";
import { StarRating } from "@/components/StarRating";
import { BookOpen, Sparkles, Loader2, Star, BookOpenText } from "lucide-react";
import { apiFetch } from "@/lib/api";

const StudentShare = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (!studentId) { setError(true); setLoading(false); return; }
      try {
        const s = await apiFetch<StudentData>(`/api/student/${encodeURIComponent(studentId)}`, { method: "GET" });
        setStudent(s);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    }
    fetch();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Student not found</h1>
          <p className="text-sm text-muted-foreground">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const stats = getStudentStats(student);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen size={20} className="text-primary-foreground" />
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

      <main className="container max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold font-sans text-foreground mb-1">{student.name}</h2>

        {/* Stats summary */}
        <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star size={14} className="text-primary" />
            {stats.totalStars} stars
          </span>
          <span>{stats.completed}/{stats.total} completed</span>
          {stats.firstAttemptPerfect > 0 && (
            <span className="flex items-center gap-1">
              <Sparkles size={14} className="text-accent" />
              {stats.firstAttemptPerfect} first-try
            </span>
          )}
        </div>

        <div className="grid gap-1">
          {SURAHS.map((surah) => {
            const progress: SurahProgress = student.progress[surah.number] || {
              stars: 0,
              firstAttempt: true,
              attempts: 0,
            };

            return (
              <div
                key={surah.number}
                className={`flex items-center justify-between rounded-lg border p-2 transition-colors ${
                  progress.stars === 5
                    ? progress.firstAttempt
                      ? "border-accent/40 bg-secondary"
                      : "border-primary/30 bg-emerald-light/30"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground w-5 text-right shrink-0">
                    {surah.number}
                  </span>
                  <div className="min-w-0 flex flex-col justify-center leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-foreground">{surah.name}</span>
                      {progress.stars === 5 && progress.firstAttempt && (
                        <Sparkles size={12} className="text-accent shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-display">{surah.arabic}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StarRating
                    rating={progress.stars}
                    firstAttempt={progress.firstAttempt}
                    onRate={() => {}}
                    size={16}
                    readOnly
                  />
                </div>
              </div>
            );
          })}
        </div>

        {student.customItems.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <BookOpenText size={16} className="text-muted-foreground" />
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Custom items
              </h3>
            </div>
            <div className="grid gap-1">
              {student.customItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-lg border p-2 transition-colors ${
                    item.stars === 5
                      ? item.firstAttempt
                        ? "border-accent/40 bg-secondary"
                        : "border-primary/30 bg-emerald-light/30"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="min-w-0 flex flex-col justify-center leading-tight">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-sm text-foreground truncate">{item.title}</span>
                      {item.stars === 5 && item.firstAttempt && (
                        <Sparkles size={12} className="text-accent shrink-0" />
                      )}
                    </div>
                    {item.attempts > 1 && (
                      <span className="text-[10px] text-muted-foreground font-display">{item.attempts} tries</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StarRating
                      rating={item.stars}
                      firstAttempt={item.firstAttempt}
                      onRate={() => {}}
                      size={16}
                      readOnly
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentShare;
