import React from 'react';
import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="relative py-32 px-6 md:px-16 overflow-hidden">
      {/* Large background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="font-sans text-[15vw] font-bold uppercase tracking-wider text-foreground/[0.03] leading-none">
          Travel
        </span>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="w-full h-px bg-border mb-12" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="font-sans text-xs tracking-[0.3em] uppercase text-foreground mb-2">
              Jon Bon
            </p>
            <p className="font-serif text-sm text-muted-foreground max-w-sm leading-relaxed">
              Travel narratives and cinematic storytelling from the road. I use my camera to document new places, honest moments, and the stories that happen along the way.
            </p>
          </div>

          <div className="flex items-center gap-8">
            <Link to="/journal" className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors">
              Journal
            </Link>
            <Link to="/portfolio" className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors">
              Works
            </Link>
            <Link to="/contact" className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors">
              Inquiry
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="font-sans text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Jon Bon. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://instagram.com/jooonbon" target="_blank" rel="noopener noreferrer" className="font-sans text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Instagram</a>
            <a href="https://youtube.com/jonbontabas" target="_blank" rel="noopener noreferrer" className="font-sans text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}