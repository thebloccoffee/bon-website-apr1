import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import SiteFooter from './SiteFooter';
import BonpointsHeader from './BonpointsHeader';
import BonpointsFooter from './BonpointsFooter';
import CookieBanner from '../CookieBanner';
import { RouteSeo } from '../shared/Seo';

// jooonbon is the main site. Everything under /bonpoints gets bon.points'
// own header, footer and colour scope.
export default function SiteLayout() {
  const { pathname, hash } = useLocation();
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
        <BonpointsHeader />
        <main>
          <Outlet />
        </main>
        <BonpointsFooter />
        <CookieBanner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RouteSeo />
      <Navigation />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}
