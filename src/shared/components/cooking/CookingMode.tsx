import { useEffect, useState, type FC } from 'react';
import { EditorialLayout } from './layouts/EditorialLayout';
import { TimerRingLayout } from './layouts/TimerRingLayout';
import { CardStackLayout } from './layouts/CardStackLayout';
import { SplitLayout } from './layouts/SplitLayout';
import { parseStepDuration } from '../../utils/parseStepDuration';
import { useWakeLock } from '../../hooks/useWakeLock';
import { formatClock, type CookLayout, type CookLayoutProps, type TimerState } from './types';
import './CookingMode.css';

interface CookingModeProps {
  name: string;
  steps: string[];
  ingredients: string[];
  time: number;
  isEnglish: boolean;
  onClose: () => void;
}

const SECONDS_PER_MINUTE = 60;

const LAYOUTS: Record<CookLayout, FC<CookLayoutProps>> = {
  editorial: EditorialLayout,
  ring: TimerRingLayout,
  cards: CardStackLayout,
  split: SplitLayout,
};

const layoutLabel = (layout: CookLayout, isEnglish: boolean): string => {
  const labels: Record<CookLayout, [string, string]> = {
    editorial: ['Text', 'Текст'],
    ring: ['Timer', 'Таймер'],
    cards: ['Cards', 'Карти'],
    split: ['Split', 'Списък'],
  };
  return labels[layout][isEnglish ? 0 : 1];
};

export const CookingMode = ({ name, steps, ingredients, time, isEnglish, onClose }: CookingModeProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState<CookLayout>('editorial');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [timer, setTimer] = useState<TimerState | null>(null);

  const wakeStatus = useWakeLock(true);

  const totalSteps = steps.length;
  const isLast = stepIndex === totalSteps - 1;
  const currentDuration = parseStepDuration(steps[stepIndex]);

  // Lock background scroll while the overlay is open (mirrors Modal.tsx).
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Tick the active timer once per second while it is running.
  useEffect(() => {
    if (timer == null || !timer.running) return;
    const id = setInterval(() => {
      setTimer((prev) => {
        if (prev == null || !prev.running) return prev;
        const remainingSec = prev.remainingSec - 1;
        if (remainingSec <= 0) {
          if (typeof navigator.vibrate === 'function') navigator.vibrate([200, 100, 200]);
          return { ...prev, remainingSec: 0, running: false, done: true };
        }
        return { ...prev, remainingSec };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timer == null, timer?.running]);

  // Start / pause / resume / restart the timer for the current step.
  const handleToggleTimer = () => {
    setTimer((prev) => {
      if (prev != null && prev.stepIndex === stepIndex) {
        if (prev.done) return { ...prev, remainingSec: prev.totalSec, running: true, done: false };
        return { ...prev, running: !prev.running };
      }
      if (currentDuration == null) return prev;
      const totalSec = currentDuration * SECONDS_PER_MINUTE;
      return { stepIndex, totalSec, remainingSec: totalSec, running: true, done: false };
    });
  };

  const attemptClose = () => {
    if (stepIndex > 0) setShowExitConfirm(true);
    else onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showExitConfirm) setShowExitConfirm(false);
        else attemptClose();
        return;
      }
      if (e.key === 'ArrowRight') {
        if (isLast) onClose();
        else setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
      } else if (e.key === 'ArrowLeft') {
        setStepIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, isLast, showExitConfirm, totalSteps]);

  const progressPct = ((stepIndex + 1) / totalSteps) * 100;
  const Layout = LAYOUTS[layout];

  // A timer running on a step the cook has navigated away from surfaces as a toast.
  const awayTimer = timer != null && timer.stepIndex !== stepIndex ? timer : null;

  return (
    <div className="cook" role="dialog" aria-modal="true" aria-label={isEnglish ? 'Cooking mode' : 'Режим готвене'}>
      <div className="cook-top">
        <div className="cook-rail">
          <span className="cook-counter">
            <b>{stepIndex + 1}</b> {isEnglish ? 'of' : 'от'} {totalSteps}
          </span>
          <div className="cook-progress">
            <div className="cook-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="cook-title-mark">{name}</span>
        </div>
        <div className="cook-actions">
          <div className="cook-layout-switch" role="group" aria-label={isEnglish ? 'Layout' : 'Изглед'}>
            {(Object.keys(LAYOUTS) as CookLayout[]).map((key) => (
              <button
                key={key}
                type="button"
                className={key === layout ? 'on' : undefined}
                aria-pressed={key === layout}
                onClick={() => setLayout(key)}
              >
                {layoutLabel(key, isEnglish)}
              </button>
            ))}
          </div>
          {wakeStatus !== 'unsupported' && (
            <span className={`wake-badge ${wakeStatus}`}>
              <span className="wake-led" />
              {wakeStatus === 'on'
                ? isEnglish ? 'Screen on' : 'Екранът свети'
                : isEnglish ? 'Screen may sleep' : 'Екранът може да заспи'}
            </span>
          )}
          <button
            type="button"
            className="cook-close"
            onClick={attemptClose}
            aria-label={isEnglish ? 'Close cooking mode' : 'Затвори режим готвене'}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="cook-body">
        <Layout
          steps={steps}
          stepIndex={stepIndex}
          ingredients={ingredients}
          isEnglish={isEnglish}
          durationMin={currentDuration}
          timer={timer}
          onToggleTimer={handleToggleTimer}
        />
      </div>

      <div className="cook-foot">
        <div className="cook-foot-left">
          {isEnglish ? 'Total' : 'Общо'} <b>{time} {isEnglish ? 'min' : 'мин'}</b>
        </div>
        <div className="cook-nav">
          <button
            type="button"
            className="nav-btn"
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            disabled={stepIndex === 0}
          >
            <span className="arrow">←</span>
            {isEnglish ? 'Back' : 'Назад'}
          </button>
          <button
            type="button"
            className="nav-btn primary"
            onClick={() => (isLast ? onClose() : setStepIndex((i) => Math.min(i + 1, totalSteps - 1)))}
          >
            {isLast ? (isEnglish ? 'Finish' : 'Завърши') : isEnglish ? 'Next' : 'Напред'}
            {!isLast && <span className="arrow">→</span>}
          </button>
        </div>
        <div className="cook-foot-right" />
      </div>

      {awayTimer != null && (
        <div className={`subtimer${awayTimer.done ? ' done' : ''}`}>
          <span className="label">
            {isEnglish ? 'Step' : 'Стъпка'} {awayTimer.stepIndex + 1}
          </span>
          <span className="num">{awayTimer.done ? (isEnglish ? 'Done' : 'Готово') : formatClock(awayTimer.remainingSec)}</span>
          <button
            type="button"
            onClick={() => setStepIndex(awayTimer.stepIndex)}
            aria-label={isEnglish ? 'Go to timer step' : 'Към стъпката с таймера'}
          >
            ↗
          </button>
          <button
            type="button"
            onClick={() => setTimer(null)}
            aria-label={isEnglish ? 'Dismiss timer' : 'Откажи таймера'}
          >
            ✕
          </button>
        </div>
      )}

      {showExitConfirm && (
        <div
          className="cook-confirm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExitConfirm(false);
          }}
        >
          <div className="cook-confirm" role="alertdialog" aria-modal="true">
            <div className="cook-confirm-title">
              {isEnglish ? <>Leave <em>cooking</em>?</> : <>Изход от <em>готвене</em>?</>}
            </div>
            <p className="cook-confirm-sub">
              {isEnglish
                ? `You're on step ${stepIndex + 1} of ${totalSteps}. Your progress here won't be saved.`
                : `На стъпка ${stepIndex + 1} от ${totalSteps} си. Напредъкът тук няма да се запази.`}
            </p>
            <div className="cook-confirm-row">
              <button type="button" className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>
                {isEnglish ? 'Keep cooking' : 'Продължи'}
              </button>
              <button type="button" className="btn btn-danger" onClick={onClose}>
                {isEnglish ? 'Leave' : 'Изход'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
