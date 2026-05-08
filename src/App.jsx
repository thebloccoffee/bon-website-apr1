import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import SiteLayout from './components/layout/SiteLayout';

const Home = lazy(() => import('./pages/Home'));
const Journal = lazy(() => import('./pages/Journal'));
const BlogPostPage = lazy(() => import('./pages/BlogPost'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Contact = lazy(() => import('./pages/Contact'));
const Admin = lazy(() => import('./pages/Admin'));

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Suspense fallback={null}><Home /></Suspense>} />
              <Route path="/journal" element={<Suspense fallback={null}><Journal /></Suspense>} />
              <Route path="/journal/:slug" element={<Suspense fallback={null}><BlogPostPage /></Suspense>} />
              <Route path="/portfolio" element={<Suspense fallback={null}><Portfolio /></Suspense>} />
              <Route path="/contact" element={<Suspense fallback={null}><Contact /></Suspense>} />
              <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
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
