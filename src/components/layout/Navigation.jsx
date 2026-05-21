import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

const navLinks = [
  { label: 'Journal', path: '/journal' },
  { label: 'Works', path: '/portfolio' },
  { label: 'Inquiry', path: '/contact' },
];

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
              className={`h-10 md:h-14 w-auto transition-all duration-500 ${logoInvert}`}
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-sans text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:opacity-60 ${linkColor} ${location.pathname === link.path ? 'opacity-60' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className={`transition-all duration-300 hover:opacity-60 ${iconColor}`}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Mobile right side */}
          <div className="md:hidden flex items-center gap-4 relative z-50">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className={`transition-colors duration-300 ${isOpen ? 'text-foreground' : iconColor}`}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
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
            className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-center gap-12"
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
                  className="font-sans text-2xl tracking-[0.2em] uppercase text-foreground hover:text-accent transition-colors"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
