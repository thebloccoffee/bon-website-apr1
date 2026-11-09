import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import SiteLayout from './components/layout/SiteLayout';

const Home = lazy(() => import('./pages/MonitorHome'));
const TravelSlug = lazy(() => import('./pages/TravelSlug'));
const Journal = lazy(() => import('./pages/Journal'));
const BlogPostPage = lazy(() => import('./pages/BlogPost'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Contact = lazy(() => import('./pages/Contact'));
const Admin = lazy(() => import('./pages/Admin'));
const Bonpoints = lazy(() => import('./pages/Bonpoints'));
const BonpointsGuides = lazy(() => import('./pages/BonpointsGuides'));
const BonpointsVideos = lazy(() => import('./pages/BonpointsVideos'));
const Destinations = lazy(() => import('./pages/Destinations'));
const TravelDestination = lazy(() => import('./pages/TravelDestination'));
const Videos = lazy(() => import('./pages/Videos'));
const Stories = lazy(() => import('./pages/Stories'));
const Shop = lazy(() => import('./pages/Shop'));
const Product = lazy(() => import('./pages/Product'));
const ShopThanks = lazy(() => import('./pages/ShopThanks'));
const About = lazy(() => import('./pages/About'));
const Search = lazy(() => import('./pages/Search'));
const Privacy = lazy(() => import('./pages/legal/Privacy'));
const Terms = lazy(() => import('./pages/legal/Terms'));
const Refunds = lazy(() => import('./pages/legal/Refunds'));
const Disclosures = lazy(() => import('./pages/legal/Disclosures'));

// Route list is the single source of truth for the SPA. api/page.js (SEO head
// injection) and api/sitemap.js mirror these paths; keep them in sync.
const routes = [
  ['/', Home],
  ['/bonpoints', Bonpoints],
  ['/bonpoints/guides', BonpointsGuides],
  ['/bonpoints/guides/:slug', BlogPostPage],
  ['/bonpoints/videos', BonpointsVideos],
  ['/travel', Destinations],
  ['/travel/:slug', TravelSlug],
  ['/journal', Journal],
  ['/journal/:slug', BlogPostPage],
  ['/videos', Videos],
  ['/stories', Stories],
  ['/shop', Shop],
  ['/shop/thanks', ShopThanks],
  ['/shop/:slug', Product],
  ['/portfolio', Portfolio],
  ['/about', About],
  ['/contact', Contact],
  ['/search', Search],
  ['/privacy', Privacy],
  ['/terms', Terms],
  ['/refunds', Refunds],
  ['/disclosures', Disclosures],
  ['/admin', Admin],
];

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route element={<SiteLayout />}>
              {routes.map(([path, Page]) => (
                <Route key={path} path={path} element={<Suspense fallback={<div className="min-h-screen" />}><Page /></Suspense>} />
              ))}
              {/* jooonbon is the main site now, so its old brand page points home. */}
              <Route path="/jooonbon" element={<Navigate to="/" replace />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
