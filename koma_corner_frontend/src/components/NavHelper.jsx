import React from 'react';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export function Breadcrumb({ items = [] }) {
  /** Minimal breadcrumb. items: [{label, to?}] */
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 12, marginBottom: 8 }}>
      {items.map((it, idx) => (
        <span key={idx}>
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span>{it.label}</span>}
          {idx < items.length - 1 ? ' / ' : ''}
        </span>
      ))}
    </nav>
  );
}
