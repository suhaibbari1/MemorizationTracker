import { useState, useRef } from "react";
import { CustomItemProgress, StudentData, SURAHS, SurahProgress } from "@/lib/data";
import { StarRating } from "./StarRating";
import { ArrowLeft, Sparkles, RotateCcw, CheckSquare, Square, Star, Share2, ArrowDownToLine, Plus, Trash2, BookOpenText } from "lucide-react";
import { toast } from "sonner";

interface StudentDetailProps {
  student: StudentData;
  onBack: () => void;
  onUpdateSurah: (surahNumber: number, stars: number) => void;
  onResetSurah: (surahNumber: number) => void;
  onBulkUpdate: (surahNumbers: number[], stars: number) => void;
  onAddCustomItem: (title: string) => void;
  onUpdateCustomItem: (itemId: string, stars: number) => void;
  onDeleteCustomItem: (itemId: string, title: string) => void;
}

export function StudentDetail({
  student,
  onBack,
  onUpdateSurah,
  onResetSurah,
  onBulkUpdate,
  onAddCustomItem,
  onUpdateCustomItem,
  onDeleteCustomItem,
}: StudentDetailProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStars, setBulkStars] = useState(5);
  const [rangeSelectMode, setRangeSelectMode] = useState(false);
  const lastSelectedIdx = useRef<number | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");

  const toggleSelect = (surahNumber: number) => {
    const idx = SURAHS.findIndex((s) => s.number === surahNumber);
    lastSelectedIdx.current = idx;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(surahNumber)) next.delete(surahNumber);
      else next.add(surahNumber);
      return next;
    });
  };

  const selectRange = (surahNumber: number) => {
    const currentIdx = SURAHS.findIndex((s) => s.number === surahNumber);
    const startIdx = lastSelectedIdx.current ?? currentIdx;
    const [from, to] = startIdx < currentIdx ? [startIdx, currentIdx] : [currentIdx, startIdx];
    
    setSelected((prev) => {
      const next = new Set(prev);
      for (let i = from; i <= to; i++) {
        next.add(SURAHS[i].number);
      }
      return next;
    });
    lastSelectedIdx.current = currentIdx;
    setRangeSelectMode(false); // Exit range mode after selection
  };

  const selectAll = () => {
    if (selected.size === SURAHS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(SURAHS.map((s) => s.number)));
    }
  };

  const applyBulk = () => {
    if (selected.size === 0) return;
    onBulkUpdate(Array.from(selected), bulkStars);
    setSelected(new Set());
    setBulkMode(false);
    setRangeSelectMode(false);
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelected(new Set());
    setRangeSelectMode(false);
  };

  const handleSurahClick = (surahNumber: number, e: React.MouseEvent) => {
    if (e.shiftKey && bulkMode) {
      // Shift+click: select range from last selected (desktop)
      selectRange(surahNumber);
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+click: enter bulk mode and toggle selection
      if (!bulkMode) setBulkMode(true);
      toggleSelect(surahNumber);
    } else if (bulkMode) {
      if (rangeSelectMode && lastSelectedIdx.current !== null) {
        // Range select mode on mobile
        selectRange(surahNumber);
      } else {
        toggleSelect(surahNumber);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="font-semibold text-sm">Back to Students</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const url = `${window.location.origin}/student/${student.id}`;
              navigator.clipboard.writeText(url);
              toast.success("Share link copied to clipboard");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Share2 size={14} />
            Share
          </button>
          <button
            onClick={bulkMode ? exitBulkMode : () => setBulkMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              bulkMode
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <CheckSquare size={14} />
            {bulkMode ? "Cancel" : "Bulk Edit"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-sans text-foreground">{student.name}</h2>
        {!bulkMode && (
          <span className="text-[10px] text-muted-foreground hidden sm:block">Ctrl+click to select, Shift+click for range</span>
        )}
      </div>

      {/* Bulk action bar */}
      {bulkMode && (
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              {selected.size === SURAHS.length ? "Deselect All" : "Select All"}
            </button>
            <button
              onClick={() => {
                if (selected.size === 0) {
                  toast.info("Tap a surah first, then tap 'Select To' and tap another surah");
                  return;
                }
                setRangeSelectMode(!rangeSelectMode);
              }}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                rangeSelectMode 
                  ? "text-accent" 
                  : "text-primary hover:underline"
              }`}
            >
              <ArrowDownToLine size={12} />
              {rangeSelectMode ? "Tap end surah..." : "Select To"}
            </button>
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-muted-foreground">Set to:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setBulkStars(s)}
                  className="p-0.5"
                >
                  <Star
                    size={16}
                    className={s <= bulkStars ? "text-primary fill-primary" : "text-muted-foreground"}
                  />
                </button>
              ))}
            </div>
            <button
              onClick={applyBulk}
              disabled={selected.size === 0}
              className="ml-2 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Custom items */}
      <div className="mt-5 mb-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpenText size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Custom items
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {student.customItems.length} item{student.customItems.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const title = newItemTitle.trim();
              if (!title) return;
              onAddCustomItem(title);
              setNewItemTitle("");
            }}
            placeholder='Add e.g. "Dua e Qunoot"'
            className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={bulkMode}
          />
          <button
            onClick={() => {
              const title = newItemTitle.trim();
              if (!title) return;
              onAddCustomItem(title);
              setNewItemTitle("");
            }}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            disabled={bulkMode || !newItemTitle.trim()}
            title={bulkMode ? "Exit bulk edit to add items" : "Add custom item"}
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} />
              Add
            </span>
          </button>
        </div>

        {student.customItems.length > 0 && (
          <div className="mt-3 grid gap-1">
            {student.customItems.map((item: CustomItemProgress) => (
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
                {!bulkMode && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StarRating
                      rating={item.stars}
                      firstAttempt={item.firstAttempt}
                      onRate={(stars) => onUpdateCustomItem(item.id, stars)}
                      size={16}
                    />
                    <button
                      onClick={() => onDeleteCustomItem(item.id, item.title)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-1">
        {SURAHS.map((surah) => {
          const progress: SurahProgress = student.progress[surah.number] || {
            stars: 0,
            firstAttempt: true,
            attempts: 0,
          };

          const isRangeStart = rangeSelectMode && lastSelectedIdx.current !== null && 
            SURAHS[lastSelectedIdx.current]?.number === surah.number;

          return (
            <div
              key={surah.number}
              onClick={(e) => handleSurahClick(surah.number, e)}
              className={`flex items-center justify-between rounded-lg border p-2 transition-colors ${
                bulkMode ? "cursor-pointer" : ""
              } ${
                isRangeStart
                  ? "border-accent bg-accent/20 ring-2 ring-accent/50"
                  : bulkMode && selected.has(surah.number)
                    ? "border-primary/50 bg-primary/10"
                    : progress.stars === 5
                      ? progress.firstAttempt
                        ? "border-accent/40 bg-secondary"
                        : "border-primary/30 bg-emerald-light/30"
                      : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {bulkMode && (
                  <span className="shrink-0">
                    {selected.has(surah.number) ? (
                      <CheckSquare size={16} className="text-primary" />
                    ) : (
                      <Square size={16} className="text-muted-foreground" />
                    )}
                  </span>
                )}
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
              {!bulkMode && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {progress.attempts > 1 && (
                    <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {progress.attempts} tries
                    </span>
                  )}
                  <StarRating
                    rating={progress.stars}
                    firstAttempt={progress.firstAttempt}
                    onRate={(stars) => onUpdateSurah(surah.number, stars)}
                    size={16}
                  />
                  {progress.stars > 0 && (
                    <button
                      onClick={() => onResetSurah(surah.number)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Reset stars and tries"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
