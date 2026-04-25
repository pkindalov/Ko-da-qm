type BadgeType = 'allergy' | 'dislike' | 'safe' | 'primary' | 'neutral';

interface BadgeProps {
  type?: BadgeType;
  children: React.ReactNode;
}

const classMap: Record<BadgeType, string> = {
  allergy: 'badge badge-allergy',
  dislike: 'badge badge-dislike',
  safe:    'badge badge-safe',
  primary: 'badge badge-primary',
  neutral: 'badge badge-neutral',
};

export function Badge({ type = 'neutral', children }: BadgeProps) {
  return <span className={classMap[type]}>{children}</span>;
}
