import React from 'react';

/**
 * TitleGrid component renders items in a strict 4-column grid.
 * The grid always keeps exactly 4 columns. On viewports narrower than the minimum
 * width required, it enables horizontal scrolling instead of changing the number of columns.
 *
 * Props:
 * - items: array of data items to render
 * - renderItem: function(item, index) => ReactNode (card content)
 * - gap: CSS gap between grid items (default 24px to match Ocean Professional spacing)
 * - cardMinHeight: optional minimum height for cards (not enforced here; pass via renderItem)
 * - className: optional extra class on wrapper
 */
// PUBLIC_INTERFACE
export function TitleGrid({ items = [], renderItem, gap = 24, cardMinHeight, className = '' }) {
  /** Strict 4-column grid wrapper with scroll on narrow screens. */
  // Inline CSS variables to allow per-use spacing customization while keeping a single CSS class behavior.
  const style = {
    ['--kc-grid-gap']: typeof gap === 'number' ? `${gap}px` : gap,
  };

  return (
    <div className={`kc-title-grid-wrap ${className}`} style={style}>
      <div className="kc-title-grid">
        {(items || []).map((it, idx) => (
          <div className="kc-title-grid-cell" key={it?.id ?? idx} style={cardMinHeight ? { minHeight: cardMinHeight } : undefined}>
            {renderItem ? renderItem(it, idx) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TitleGrid;
