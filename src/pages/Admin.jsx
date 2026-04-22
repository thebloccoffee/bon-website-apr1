import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import BlogPostEditor from '../components/admin/BlogPostEditor';
import PortfolioEditor from '../components/admin/PortfolioEditor';
import DestinationsEditor from '../components/admin/DestinationsEditor';

const TABS = [
  { key: 'blog', label: 'Blog Posts' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'destinations', label: 'Destinations' },
];

export default function Admin() {
  const { isAdmin, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('blog');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isAdmin) {
    return (
      <div className="pt-28 pb-24 px-6 md:px-16 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h1 className="font-sans text-3xl font-light tracking-[-0.02em]">Admin</h1>
            <p className="font-serif text-muted-foreground mt-2 text-sm">Enter your password to continue.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const ok = login(password);
              if (!ok) setError('Incorrect password.');
            }}
            className="space-y-6"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
            />
            {error && <p className="font-sans text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              className="font-sans text-xs tracking-[0.3em] uppercase border border-foreground px-8 py-3 hover:bg-foreground hover:text-background transition-all duration-300"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 px-6 md:px-16 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="font-sans text-4xl md:text-5xl font-light tracking-[-0.02em]">Admin Studio</h1>
            <p className="font-serif text-muted-foreground mt-2">Manage your content.</p>
          </div>
          <button
            onClick={logout}
            className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            Log out
          </button>
        </div>

        <div className="flex gap-8 mb-12 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`font-sans text-xs tracking-[0.2em] uppercase pb-4 border-b-2 transition-all duration-300 -mb-px ${
                activeTab === tab.key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'blog' && <BlogPostEditor />}
        {activeTab === 'portfolio' && <PortfolioEditor />}
        {activeTab === 'destinations' && <DestinationsEditor />}
      </div>
    </div>
  );
}
