import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';

/**
 * Compact site search input.
 *
 * Uncontrolled (default): keeps its own value and navigates to /search?q=... on submit.
 * Controlled: pass `value` + `onValueChange` (the /search page does this so the
 * input stays synced to the URL); `onSubmit` overrides the navigate.
 *
 * Props: value, onValueChange, onSubmit, defaultValue, autoFocus,
 *        slashToFocus (press "/" anywhere to focus), placeholder, label, id, className.
 */
const SearchBox = forwardRef(function SearchBox(
  {
    value,
    onValueChange,
    onSubmit,
    defaultValue = '',
    autoFocus = false,
    slashToFocus = false,
    placeholder = 'Search posts, videos, shop',
    label = 'Search the site',
    id = 'site-search',
    className = '',
  },
  ref
) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;

  useImperativeHandle(ref, () => inputRef.current);

  const setValue = (v) => {
    if (!controlled) setInner(v);
    onValueChange?.(v);
  };

  useEffect(() => {
    if (!slashToFocus) return undefined;
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashToFocus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = (current || '').trim();
    if (onSubmit) {
      onSubmit(q);
      return;
    }
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={current}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && current) {
            e.preventDefault();
            setValue('');
          }
        }}
        placeholder={placeholder}
        className="w-full appearance-none border border-border bg-transparent py-3 pl-10 pr-10 font-sans text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {current ? (
        <button
          type="button"
          onClick={() => {
            setValue('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : slashToFocus ? (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 border border-border px-1.5 font-sans text-tk-xs text-muted-foreground md:block"
        >
          /
        </kbd>
      ) : null}
    </form>
  );
});

export default SearchBox;
