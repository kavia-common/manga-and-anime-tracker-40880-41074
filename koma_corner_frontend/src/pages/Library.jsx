import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Rating } from '../components/Rating';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export function Library() {
  /** My Library page: shows rated items and allows adjusting ratings. */
  const { CatalogAPI, ratings, setRating, user } = useAppContext();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await CatalogAPI.list();
      if (mounted) setItems(data);
    })();
    return () => { mounted = false; };
  }, [CatalogAPI]);

  const rated = useMemo(() => {
    return items.filter(i => ratings[i.id]);
  }, [items, ratings]);

  if (!user) return <div className="kc-empty">Please sign in to view your library.</div>;
  if (!rated.length) return <div className="kc-empty">You haven't rated any titles yet.</div>;

  return (
    <div>
      <div className="kc-section">
        <h2 style={{ margin: 0 }}>My Library</h2>
        <span className="kc-subtle">{rated.length} items</span>
      </div>
      <div className="kc-grid">
        {rated.map(item => (
          <div key={item.id} className="kc-card">
            <Link to={`/title/${item.id}`}>
              <img src={item.cover} alt={item.title} />
            </Link>
            <div className="kc-card-body">
              <div className="kc-title">{item.title}</div>
              <Rating value={ratings[item.id] || 0} onChange={(v) => setRating(item.id, v)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
