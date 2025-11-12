import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

// PUBLIC_INTERFACE
export function Home() {
  /** Landing page with catalog grid and search filtering. */
  const { CatalogAPI, search } = useAppContext();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      const data = await CatalogAPI.list();
      if (mounted) {
        setItems(data);
        setBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [CatalogAPI]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.title.toLowerCase().includes(q));
  }, [items, search]);

  if (busy) return <div className="kc-empty">Loading…</div>;
  if (!filtered.length) return <div className="kc-empty">No results</div>;

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>Discover</h2>
      </div>
      <div className="kc-grid">
        {filtered.map(item => (
          <Link to={`/title/${item.id}`} key={item.id} className="kc-card">
            <img src={item.cover} alt={item.title} loading="lazy" />
            <div className="kc-card-body">
              <div className="kc-title">{item.title}</div>
              <div className="kc-subtle">{item.type} • {item.year}</div>
              <div className="kc-subtle">{item.genres.join(', ')}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
