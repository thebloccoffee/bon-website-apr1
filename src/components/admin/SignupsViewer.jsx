import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { adminList } from '@/api/adminApi';
import { BRANDS, BRAND_KEYS } from '@/lib/brands';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : '');

function csvCell(v) {
  let s = v == null ? '' : String(v);
  // Stop spreadsheet formula injection when the CSV is opened in Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(rows, brand) {
  const cols = ['email', 'brand', 'source', 'consent_text', 'consent_at', 'created_at', 'unsubscribed_at'];
  const lines = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `signups-${brand}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read-only list of newsletter signups (email_signups), with consent records and CSV export. */
export default function SignupsViewer() {
  const [brand, setBrand] = useState('all');
  const [showUnsub, setShowUnsub] = useState(false);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'email_signups'],
    queryFn: () => adminList('email_signups'),
  });

  const rows = useMemo(
    () => data.filter((r) => (brand === 'all' || r.brand === brand) && (showUnsub || !r.unsubscribed_at)),
    [data, brand, showUnsub],
  );
  const activeCount = data.filter((r) => !r.unsubscribed_at).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-sans text-2xl font-light">Signups</h2>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            {activeCount} subscribed{data.length !== activeCount ? `, ${data.length - activeCount} unsubscribed` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="bg-background border-b border-border focus:border-foreground outline-none py-2 font-sans text-sm"
          >
            <option value="all">All brands</option>
            {BRAND_KEYS.map((k) => (
              <option key={k} value={k}>{BRANDS[k].name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
            <input type="checkbox" checked={showUnsub} onChange={(e) => setShowUnsub(e.target.checked)} />
            Show unsubscribed
          </label>
          <button
            type="button"
            onClick={() => downloadCsv(rows, brand)}
            disabled={!rows.length}
            className="flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase border border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {isLoading && <p className="font-sans text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="font-sans text-sm text-destructive">{error.message}</p>}
      {!isLoading && !error && !rows.length && (
        <p className="font-sans text-sm text-muted-foreground">No signups yet.</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs tracking-[0.15em] uppercase text-muted-foreground border-b border-border">
                <th className="py-3 pr-4 font-normal">Email</th>
                <th className="py-3 pr-4 font-normal">Brand</th>
                <th className="py-3 pr-4 font-normal">Source</th>
                <th className="py-3 pr-4 font-normal">Consented</th>
                <th className="py-3 pr-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 align-top">
                  <td className="py-3 pr-4 break-all">{r.email}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{BRANDS[r.brand]?.name || r.brand}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.source || ''}</td>
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap" title={r.consent_text}>
                    {fmt(r.consent_at)}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {r.unsubscribed_at ? `Unsubscribed ${fmt(r.unsubscribed_at)}` : 'Subscribed'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-sans text-xs text-muted-foreground">Hover a consent date to see the exact wording the person agreed to. The CSV includes it.</p>
        </div>
      )}
    </div>
  );
}
