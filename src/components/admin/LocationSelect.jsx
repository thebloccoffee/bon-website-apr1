import React from 'react';

export const LOCATION_GROUPS = [
  {
    continent: 'Americas',
    countries: ['Canada', 'Quebec', 'USA', 'Mexico', 'Peru', 'Colombia', 'Brazil', 'Argentina', 'Costa Rica', 'Cuba'],
  },
  {
    continent: 'Asia',
    countries: ['Vietnam', 'Japan', 'Philippines', 'Thailand', 'Indonesia', 'Bali', 'Cambodia', 'Laos', 'Myanmar', 'Malaysia', 'Singapore', 'South Korea', 'China', 'Taiwan', 'Nepal', 'India', 'Sri Lanka', 'Hong Kong'],
  },
  {
    continent: 'Europe',
    countries: ['Portugal', 'Spain', 'France', 'Italy', 'Norway', 'Sweden', 'Denmark', 'Iceland', 'Germany', 'Netherlands', 'Greece', 'Croatia', 'Czech Republic', 'Austria', 'Switzerland', 'Poland', 'Hungary'],
  },
  {
    continent: 'Africa',
    countries: ['Morocco', 'Egypt', 'South Africa', 'Kenya', 'Tanzania', 'Ethiopia'],
  },
  {
    continent: 'Oceania',
    countries: ['Australia', 'New Zealand', 'Fiji'],
  },
];

// Given a country name, return its continent string
export function continentFromLocation(location) {
  if (!location) return '';
  const group = LOCATION_GROUPS.find(g =>
    g.countries.some(c => c.toLowerCase() === location.toLowerCase())
  );
  return group ? group.continent : '';
}

export default function LocationSelect({ value, onChange, className = '' }) {
  return (
    <select
      className={`w-full bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm ${className}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— Select location —</option>
      {LOCATION_GROUPS.map(({ continent, countries }) => (
        <optgroup key={continent} label={continent}>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
