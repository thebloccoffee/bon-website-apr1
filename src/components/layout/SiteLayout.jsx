import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MonitorHeader from '../monitor/MonitorHeader';
import '../monitor/monitor.css';
import SiteFooter from './SiteFooter';
import BonpointsHeader from './BonpointsHeader';
import BonpointsFooter from './BonpointsFooter';
import CookieBanner from '../CookieBanner';
import { RouteSeo } from '../shared/Seo';
import { findPlace } from '@/lib/places';

// jooonbon is the main site. Everything under /bonpoints gets bon.points'
// own header, footer and colour scope.
export default function SiteLayout() {
  const { pathname, hash } = useLocation();
  const travelSlug = pathname.match(/^\/travel\/([^/]+)\/?$/i)?.[1];
  const isMonitor = pathname === '/' || Boolean(travelSlug && findPlace(decodeURIComponent(travelSlug)));
  const isBonpoints = pathname.toLowerCase() === '/bonpoints' || pathname.toLowerCase().startsWith('/bonpoints/');

  // Support links like /bonpoints#newsletter after client-side navigation.
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150);
    return () => clearTimeout(t);
  }, [pathname, hash]);

  if (isBonpoints) {
    return (
      <div data-brand="bonpoints" className="min-h-screen bg-background text-foreground font-sans">
        <RouteSeo />
        {/* Landing page runs header-free for now; guides and videos keep it. */}
        {pathname.toLowerCase().replace(/\/$/, '') !== '/bonpoints' && <BonpointsHeader />}
        <main>
          <Outlet />
        </main>
        <BonpointsFooter />
        <CookieBanner />
      </div>
    );
  }

  return (
    <div className="jb min-h-screen bg-background text-foreground">
      <RouteSeo />
      {/* Same camera-monitor header everywhere on jooonbon. The map pages
          place it in their own layout; every other page gets it pinned on top. */}
      {!isMonitor && (
        <div className="monitor fixed top-0 inset-x-0 z-50 px-4 md:px-6 pt-4 pb-3 border-b" style={{ borderColor: 'var(--m-line)' }}>
          <MonitorHeader />
        </div>
      )}
      <main>
        <Outlet />
      </main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}
