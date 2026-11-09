import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

// Per docs/SITEMAP.md. Brand names keep their own casing (no uppercase).
const navLinks = [
  { label: 'jooonbon', path: '/jooonbon', brand: true },
  { label: 'bon.points', path: '/bonpoints', brand: true },
  { label: 'Destinations', path: '/travel' },
  { label: 'Journal', path: '/journal' },
  { label: 'Shop', path: '/shop' },
];

const isActive = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // On hero: always white. On scroll/inner pages: white if dark, dark if light.
  const onHero = isHome && !scrolled;
  const linkColor = onHero || isDark ? 'text-white' : 'text-foreground';
  const iconColor = onHero || isDark ? 'text-white' : 'text-foreground';
  const logoInvert = onHero || isDark ? 'brightness-0 invert' : 'brightness-0';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolled || !isHome
            ? 'bg-background/90 backdrop-blur-md border-b border-border/50'
            : 'bg-transparent'
        }`}
      >
        <nav className="flex items-center justify-between px-6 md:px-16 py-5">
          <Link to="/" className="relative z-50">
            <img
              src="/logo.png"
              alt="Jon Bon"
              width="1037"
              height="474"
              className={`h-10 md:h-14 w-auto transition-all duration-500 ${logoInvert}`}
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 lg:gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                aria-current={isActive(location.pathname, link.path) ? 'page' : undefined}
                className={`font-sans text-xs transition-all duration-300 hover:opacity-60 ${link.brand ? 'tracking-[0.05em]' : 'tracking-[0.2em] uppercase'} ${linkColor} ${isActive(location.pathname, link.path) ? 'opacity-60' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/search"
              aria-label="Search"
              className={`transition-all duration-300 hover:opacity-60 ${iconColor}`}
            >
              <Search size={15} />
            </Link>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className={`transition-all duration-300 hover:opacity-60 ${iconColor}`}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Mobile right side */}
          <div className="md:hidden flex items-center gap-5 relative z-50">
            <Link
              to="/search"
              aria-label="Search"
              className={`transition-colors duration-300 ${isOpen ? 'text-foreground' : iconColor}`}
            >
              <Search size={16} />
            </Link>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className={`transition-colors duration-300 ${isOpen ? 'text-foreground' : iconColor}`}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              className={`transition-colors duration-300 ${isOpen ? 'text-foreground' : iconColor}`}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-center gap-10"
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Link
                  to={link.path}
                  className={`font-sans text-2xl text-foreground hover:text-accent transition-colors ${link.brand ? 'tracking-[0.02em]' : 'tracking-[0.2em] uppercase'}`}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: navLinks.length * 0.1, duration: 0.4 }}
              className="flex items-center gap-8 pt-4"
            >
              <Link to="/about" className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link to="/contact" className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
