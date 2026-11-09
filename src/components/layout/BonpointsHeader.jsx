import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BonpointsWordmark } from '@/components/shared/BrandDoor';

// Header for everything under /bonpoints. bon.points v2 look: Ink/Bone, Inter, glass.
const links = [
  { label: 'Guides', to: '/bonpoints/guides' },
  { label: 'Videos', to: '/bonpoints/videos' },
  { label: 'Newsletter', to: '/bonpoints#newsletter' },
];

const isActive = (pathname, to) => {
  const path = to.split('#')[0];
  return path !== '/bonpoints' && (pathname === path || pathname.startsWith(`${path}/`));
};

export default function BonpointsHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setIsOpen(false), [location]);

  const linkCls = (active) =>
    `font-sans text-sm transition-opacity duration-fast hover:opacity-60 ${active ? 'text-foreground' : 'text-muted-foreground'}`;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <nav className="flex items-center justify-between px-6 md:px-16 h-[72px]">
          <Link to="/bonpoints" className="text-2xl text-foreground relative z-50" aria-label="bon.points home">
            <BonpointsWordmark />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className={linkCls(isActive(location.pathname, l.to))}
                aria-current={isActive(location.pathname, l.to) ? 'page' : undefined}>
                {l.label}
              </Link>
            ))}
            <Link to="/" className="bp-glass rounded-tk-pill px-tk-4 py-tk-2 font-sans text-xs text-foreground transition-opacity duration-fast hover:opacity-70">
              ← jooonbon
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            className="md:hidden text-foreground relative z-50"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-center gap-10 md:hidden">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="font-sans text-2xl font-medium text-foreground">
              {l.label}
            </Link>
          ))}
          <Link to="/" className="bp-glass rounded-tk-pill px-tk-6 py-tk-3 font-sans text-sm text-foreground mt-tk-4">
            ← jooonbon
          </Link>
        </div>
      )}
    </>
  );
}
