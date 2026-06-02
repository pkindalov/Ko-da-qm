import { StepTimerChip } from '../StepTimerChip';
import type { CookLayoutProps } from '../types';

export const EditorialLayout = ({
  steps,
  stepIndex,
  isEnglish,
  durationMin,
  timer,
  onToggleTimer,
}: CookLayoutProps) => (
  <div className="cook-stage">
    <div>
      <div className="cook-step-num">{String(stepIndex + 1).padStart(2, '0')}</div>
      <div className="cook-step-meta">
        <span>{isEnglish ? 'Step' : 'Стъпка'}</span>
        <span className="of">
          {isEnglish ? 'of' : 'от'} {steps.length}
        </span>
      </div>
    </div>
    <div>
      <p className="cook-step-text">{steps[stepIndex]}</p>
      <StepTimerChip
        durationMin={durationMin}
        stepIndex={stepIndex}
        timer={timer}
        isEnglish={isEnglish}
        onToggle={onToggleTimer}
      />
    </div>
  </div>
);
