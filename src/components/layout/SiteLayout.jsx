import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import SiteFooter from './SiteFooter';
import CookieBanner from '../CookieBanner';

export default function SiteLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}
