import { useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const SWIPE_THRESHOLD = 60;

export function useSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }: SwipeHandlers) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const fired = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    fired.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current || fired.current) return;

      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const elapsed = Date.now() - touchStart.current.time;

      // Must complete within 500ms
      if (elapsed > 500) {
        touchStart.current = null;
        return;
      }

      if (absDx > absDy && absDx >= SWIPE_THRESHOLD) {
        fired.current = true;
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      } else if (absDy > absDx && absDy >= SWIPE_THRESHOLD) {
        fired.current = true;
        if (dy < 0) onSwipeUp?.();
        else onSwipeDown?.();
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  const onTouchEnd = useCallback(() => {
    touchStart.current = null;
    fired.current = false;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
