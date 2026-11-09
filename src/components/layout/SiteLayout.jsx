import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import SiteFooter from './SiteFooter';
import CookieBanner from '../CookieBanner';
import { RouteSeo } from '../shared/Seo';

export default function SiteLayout() {
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
