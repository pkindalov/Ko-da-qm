import { StepTimerChip } from '../StepTimerChip';
import type { CookLayoutProps } from '../types';

export const CardStackLayout = ({
  steps,
  stepIndex,
  isEnglish,
  durationMin,
  timer,
  onToggleTimer,
}: CookLayoutProps) => {
  const total = steps.length;
  const nextStep = stepIndex + 1 < total ? steps[stepIndex + 1] : null;

  return (
    <div className="cook-cards">
      {nextStep != null && (
        <div className="cook-card peek" aria-hidden="true">
          <div className="cook-card-num">{String(stepIndex + 2).padStart(2, '0')}</div>
          <div className="cook-card-text">{nextStep}</div>
        </div>
      )}
      <div className="cook-card">
        <div className="cook-card-eyebrow">
          <span>{isEnglish ? 'Step' : 'Стъпка'}</span>
          <span>
            {stepIndex + 1}/{total}
          </span>
        </div>
        <div className="cook-card-num">{String(stepIndex + 1).padStart(2, '0')}</div>
        <div className="cook-card-text">{steps[stepIndex]}</div>
        <StepTimerChip
          durationMin={durationMin}
          stepIndex={stepIndex}
          timer={timer}
          isEnglish={isEnglish}
          onToggle={onToggleTimer}
        />
        <div className="cook-card-dots">
          {steps.map((step, index) => (
            <span
              key={step}
              className={`cook-card-dot${
                index === stepIndex ? ' active' : index < stepIndex ? ' done' : ''
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
