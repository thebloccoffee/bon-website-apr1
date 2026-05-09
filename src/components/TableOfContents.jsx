import React, { useEffect, useState } from 'react';

function extractHeadings(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = Array.from(doc.querySelectorAll('h2, h3'));
  return headings.map((h, i) => ({
    id: `heading-${i}`,
    text: h.textContent,
    level: parseInt(h.tagName[1]),
  }));
}

function injectIds(html) {
  let i = 0;
  return html.replace(/<(h[123])(.*?)>/gi, (match, tag, attrs) => {
    return `<${tag}${attrs} id="heading-${i++}">`;
  });
}

export { injectIds };

// Collapsible TOC for mobile — shown above the article body
export function MobileTOC({ html }) {
  const [open, setOpen] = useState(false);
  const headings = extractHeadings(html);
  if (headings.length < 2) return null;

  let h2Idx = 0;

  return (
    <div className="xl:hidden border border-border mb-10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 font-sans text-xs tracking-[0.2em] uppercase text-foreground"
      >
        <span>Contents</span>
        <span className="text-muted-foreground text-base leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ol className="px-5 pb-5 pt-4 space-y-2 border-t border-border list-none">
          {headings.map(({ id, text, level }) => {
            if (level === 2) h2Idx++;
            return (
              <li key={id} className={level === 3 ? 'pl-5' : ''}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors flex items-start gap-2"
                >
                  {level === 2 && (
                    <span className="shrink-0 text-accent">{h2Idx}.</span>
                  )}
                  <span>{text}</span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// Sticky desktop TOC — right gutter, numbered h2s, collapsible
export default function TableOfContents({ html }) {
  const [active, setActive] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const headings = extractHeadings(html);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-10% 0% -70% 0%' }
    );
    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [html]);

  if (headings.length < 2) return null;

  let h2Count = 0;

  return (
    <nav className="hidden xl:block sticky top-32 w-56 shrink-0 self-start">
      <div className="flex items-center justify-between mb-4">
        <p className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground">Contents</p>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors w-5 h-5 flex items-center justify-center"
          aria-label={collapsed ? 'Expand contents' : 'Collapse contents'}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>

      {!collapsed && (
        <ol className="border-l border-border space-y-0.5 list-none">
          {headings.map(({ id, text, level }) => {
            if (level === 2) h2Count++;
            const num = level === 2 ? h2Count : null;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`flex items-start gap-2 font-sans text-xs leading-snug py-1.5 border-l-2 -ml-px transition-all duration-200 ${
                    level === 2 ? 'pl-4' : 'pl-7'
                  } ${
                    active === id
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {num !== null && (
                    <span className="shrink-0 tabular-nums text-accent">{num}.</span>
                  )}
                  <span>{text}</span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
