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

export const TagInput = ({ value, onChange, placeholder, type = 'neutral' }: TagInputProps) => {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmedInput = input.trim().toLowerCase();
    if (trimmedInput && !value.includes(trimmedInput)) onChange([...value, trimmedInput]);
    setInput('');
  };

  return (
    <div>
      <div className="tag-input-row">
        <input
          className="input-field flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
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
