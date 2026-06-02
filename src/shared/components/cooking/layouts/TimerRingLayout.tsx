import { formatClock, isTimerForStep, type CookLayoutProps } from '../types';

// Geometry for the SVG ring (viewBox 0 0 100 100).
const RING_RADIUS = 46;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const TimerRingLayout = ({
  steps,
  stepIndex,
  isEnglish,
  durationMin,
  timer,
  onToggleTimer,
}: CookLayoutProps) => {
  const active = isTimerForStep(timer, stepIndex) ? timer : null;

  // Full ring when idle/ready; depletes as the timer runs down.
  const fraction = active != null ? active.remainingSec / active.totalSec : 1;
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

  const center = (() => {
    if (active != null) return active.done ? '✓' : formatClock(active.remainingSec);
    if (durationMin != null) return `${durationMin}m`;
    return String(stepIndex + 1);
  })();
  const centerLabel = (() => {
    if (active != null) return active.done ? (isEnglish ? 'Done' : 'Готово') : (isEnglish ? 'Remaining' : 'Остава');
    if (durationMin != null) return isEnglish ? 'Ready' : 'Готов';
    return isEnglish ? `Step of ${steps.length}` : `Стъпка от ${steps.length}`;
  })();
  const isIdle = active == null;

  const buttonLabel = (() => {
    if (active != null && active.done) return isEnglish ? 'Restart' : 'Отначало';
    if (active != null && active.running) return isEnglish ? 'Pause' : 'Пауза';
    if (active != null) return isEnglish ? 'Resume' : 'Продължи';
    return isEnglish ? 'Start' : 'Старт';
  })();

  return (
    <div className="cook-ring-wrap">
      <div className="cook-ring">
        <svg viewBox="0 0 100 100">
          <circle className="cook-ring-track" cx="50" cy="50" r={RING_RADIUS} />
          <circle
            className="cook-ring-fill"
            cx="50"
            cy="50"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="cook-ring-center">
          <div className={`cook-ring-num${isIdle ? ' idle' : ''}`}>{center}</div>
          <div className="cook-ring-label">{centerLabel}</div>
        </div>
      </div>
      <p className="cook-ring-step-text">{steps[stepIndex]}</p>
      {durationMin != null ? (
        <div className="cook-ring-controls">
          <button type="button" className="btn btn-primary" onClick={onToggleTimer}>
            {buttonLabel}
          </button>
        </div>
      ) : (
        <p className="cook-ring-label">{isEnglish ? 'No timer for this step' : 'Няма таймер за тази стъпка'}</p>
      )}
    </div>
  );
};
