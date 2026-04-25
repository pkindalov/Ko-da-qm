import { useState } from 'react';

type TagInputType = 'neutral' | 'danger' | 'warn';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  type?: TagInputType;
}

const tagClass: Record<TagInputType, string> = {
  neutral: 'tag-removable badge-neutral',
  danger:  'tag-removable badge-allergy',
  warn:    'tag-removable badge-dislike',
};

export function TagInput({ value, onChange, placeholder, type = 'neutral' }: TagInputProps) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim().toLowerCase();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          style={{ flex: 1 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={add}>+</button>
      </div>
      <div className="tag-list">
        {value.map((tag) => (
          <span
            key={tag}
            className={tagClass[type]}
            onClick={() => onChange(value.filter((x) => x !== tag))}
          >
            {tag} <span className="rm">✕</span>
          </span>
        ))}
      </div>
    </div>
  );
}
