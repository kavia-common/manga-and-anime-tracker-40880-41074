import React from 'react';

// PUBLIC_INTERFACE
export function Rating({ value = 0, onChange }) {
  /** Minimal star rating control (1..5). No notes/comments per requirements. */
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="kc-rating" role="radiogroup" aria-label="Rating">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          className={`kc-star ${value >= s ? 'active' : ''}`}
          aria-checked={value === s}
          role="radio"
          onClick={() => onChange?.(s)}
          title={`${s} star${s > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
