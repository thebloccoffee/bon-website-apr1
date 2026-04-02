import React, { useEffect, useState } from 'react';

function extractHeadings(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3'));
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

export default function TableOfContents({ html }) {
  const [active, setActive] = useState('');
  const headings = extractHeadings(html);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-20% 0% -70% 0%' }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [html]);

  if (headings.length < 2) return null;

  return (
    <nav className="hidden xl:block sticky top-32 w-56 shrink-0 self-start">
      <p className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
        Contents
      </p>
      <ul className="space-y-2 border-l border-border">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`block font-sans text-xs leading-snug py-1 transition-all duration-200 border-l-2 -ml-px ${
                level === 1 ? 'pl-3' : level === 2 ? 'pl-5' : 'pl-7'
              } ${
                active === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
