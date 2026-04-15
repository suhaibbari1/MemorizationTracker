import { StudentData, getStudentStats } from "@/lib/data";
import { StarRating } from "./StarRating";
import { Award, TrendingUp } from "lucide-react";

interface StudentCardProps {
  student: StudentData;
  surahTotal: number;
  onClick: () => void;
}

export function StudentCard({ student, surahTotal, onClick }: StudentCardProps) {
  const stats = getStudentStats(student, surahTotal);
  const percentage = Math.round((stats.completed / stats.total) * 100);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold font-sans text-foreground">{student.name}</h3>
        <div className="flex items-center gap-1.5">
          {stats.firstAttemptPerfect > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-accent">
              <Award size={14} />
              {stats.firstAttemptPerfect}
            </span>
          )}
        </div>
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{stats.completed}/{stats.total} items mastered</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <TrendingUp size={12} />
        <span>{stats.totalStars} total stars</span>
      </div>
    </button>
  );
}
