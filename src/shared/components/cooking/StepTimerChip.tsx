import { formatClock, isTimerForStep, type TimerState } from './types';

interface StepTimerChipProps {
  durationMin: number | null;
  stepIndex: number;
  timer: TimerState | null;
  isEnglish: boolean;
  onToggle: () => void;
}

// Tappable inline timer for the editorial/card/split layouts. Renders nothing
// when the step has no detectable duration.
export const StepTimerChip = ({
  durationMin,
  stepIndex,
  timer,
  isEnglish,
  onToggle,
}: StepTimerChipProps) => {
  if (durationMin == null) return null;

  const active = isTimerForStep(timer, stepIndex) ? timer : null;
  const stateClass = active == null ? '' : active.done ? ' done' : active.running ? ' running' : '';

  const label = (() => {
    if (active == null) {
      return `${isEnglish ? 'Start timer' : 'Стартирай таймер'} · ${durationMin}m`;
    }
    if (active.done) return isEnglish ? 'Done' : 'Готово';
    if (!active.running) return isEnglish ? 'Resume' : 'Продължи';
    return isEnglish ? 'Pause' : 'Пауза';
  })();

  return (
    <button type="button" className={`timer-inline${stateClass}`} onClick={onToggle}>
      <span aria-hidden="true">{active?.done ? '✓' : '⏱'}</span>
      {active != null && !active.done && <span className="num">{formatClock(active.remainingSec)}</span>}
      <span>{label}</span>
    </button>
  );
};
