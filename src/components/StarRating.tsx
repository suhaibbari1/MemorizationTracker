import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
  firstAttempt?: boolean;
  readOnly?: boolean;
}

export function StarRating({ rating, onRate, size = 20, firstAttempt, readOnly }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => !readOnly && onRate?.(star)}
          disabled={readOnly || !onRate}
          className={`transition-transform hover:scale-110 disabled:cursor-default ${
            star <= rating
              ? firstAttempt && rating === 5
                ? "text-accent drop-shadow-[0_0_4px_hsl(var(--gold))]"
                : "text-accent"
              : "text-border"
          }`}
        >
          <Star
            size={size}
            fill={star <= rating ? "currentColor" : "none"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
