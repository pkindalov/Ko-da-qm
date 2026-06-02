export type CookLayout = 'editorial' | 'ring' | 'cards' | 'split';

// A single timer shared across the cooking session. It belongs to one step; if
// the cook navigates away while it runs, it surfaces as a floating sub-timer.
export interface TimerState {
  stepIndex: number;
  totalSec: number;
  remainingSec: number;
  running: boolean;
  done: boolean;
}

export interface CookLayoutProps {
  steps: string[];
  stepIndex: number;
  ingredients: string[];
  isEnglish: boolean;
  durationMin: number | null;
  timer: TimerState | null;
  onToggleTimer: () => void;
}

const SECONDS_PER_MINUTE = 60;

// Formats seconds as M:SS (or MM:SS) for tabular display.
export const formatClock = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const isTimerForStep = (timer: TimerState | null, stepIndex: number): boolean =>
  timer != null && timer.stepIndex === stepIndex;
