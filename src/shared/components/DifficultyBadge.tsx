import { Badge } from './Badge';
import { localizeDifficulty } from '../utils/recipeDifficulty';
import type { Difficulty } from '../types';

// A colored dot carries the level at a glance; the badge stays neutral so the red/amber
// don't get confused with the allergy/dislike risk badges shown on the same cards.
const DIFFICULTY_DOT: Record<Difficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  isEnglish: boolean;
}

export const DifficultyBadge = ({ difficulty, isEnglish }: DifficultyBadgeProps) => (
  <Badge type="neutral">{DIFFICULTY_DOT[difficulty]} {localizeDifficulty(difficulty, isEnglish)}</Badge>
);
