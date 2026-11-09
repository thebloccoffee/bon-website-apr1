import React, { useEffect, useState } from 'react';

const KEY = 'jb_home_tour_seen';

/** One always-visible row that explains the symbols on the map and timeline. */
export default function MapLegend({ countries, stories }) {
  const mono = { fontSize: 11, letterSpacing: '0.1em', color: 'var(--m-dim)' };
  return (
    <section
      aria-label="Map legend"
      className="m-mono flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 border"
      style={{ ...mono, borderColor: 'var(--m-line)', background: 'var(--m-panel)' }}
    >
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'var(--m-rec)' }} />
        FILMED
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-full border" style={{ borderColor: 'var(--m-rec)' }} />
        IN THE EDIT
      </span>
      <span>NUMBER = STORIES AT THAT PLACE</span>
      <span className="hidden md:inline" style={{ color: "var(--m-faint)" }}>·</span>
      <span>TAP A PIN OR COUNTRY TO ZOOM</span>
      <span className="md:ml-auto" style={{ color: 'var(--m-text)' }}>
        {countries} COUNTRIES · {stories || '—'} STORIES
      </span>
    </section>
  );
}

/** First visit only: three quick steps over the map. Remembered once dismissed. */
export function CoachMarks() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage blocked: skip the tour */
    }
  }, []);

  if (!show) return null;
  const done = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };
  const steps = ['Tap a pin or a country on the map', 'Open the place for films, stories and guides', 'Or scroll the timeline below'];

  return (
    <div
      role="note"
      className="m-mono absolute z-10 left-3 bottom-14 md:left-12 md:bottom-[12%] max-w-[260px] p-3 border"
      style={{ fontSize: 11, letterSpacing: '0.06em', borderColor: 'var(--m-line-2)', background: 'color-mix(in srgb, var(--m-bg) 92%, transparent)', backdropFilter: 'blur(6px)' }}
    >
      <ol className="space-y-1.5" style={{ color: 'var(--m-text)' }}>
        {steps.map((t, i) => (
          <li key={t} className="flex gap-2">
            <span style={{ color: 'var(--m-rec)' }}>{i + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={done} className="mt-3 min-h-[36px] px-3 border" style={{ borderColor: 'var(--m-text)', letterSpacing: '0.12em' }}>
        GOT IT
      </button>
    </div>
  );
}
