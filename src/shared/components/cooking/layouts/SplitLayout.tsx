import { StepTimerChip } from '../StepTimerChip';
import { ingredientsInStep } from '../../../utils/parseStepDuration';
import type { CookLayoutProps } from '../types';

export const SplitLayout = ({
  steps,
  stepIndex,
  ingredients,
  isEnglish,
  durationMin,
  timer,
  onToggleTimer,
}: CookLayoutProps) => {
  const stepText = steps[stepIndex];
  const used = ingredientsInStep(ingredients, stepText);

  return (
    <div className="cook-split">
      <div>
        <div className="cook-split-num">
          {isEnglish ? 'Step' : 'Стъпка'} {stepIndex + 1} {isEnglish ? 'of' : 'от'} {steps.length}
        </div>
        <p className="cook-split-text">{stepText}</p>
        <StepTimerChip
          durationMin={durationMin}
          stepIndex={stepIndex}
          timer={timer}
          isEnglish={isEnglish}
          onToggle={onToggleTimer}
        />
      </div>
      <aside className="cook-split-aside">
        <div className="section-eyebrow">
          <span className="label">{isEnglish ? 'Ingredients' : 'Съставки'}</span>
        </div>
        <ul className="aux-list">
          {ingredients.map((ingredient) => (
            <li key={ingredient} className={used.includes(ingredient) ? 'used' : undefined}>
              {ingredient}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};
