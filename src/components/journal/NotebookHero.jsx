import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import './notebook.css';

// Journal hero: an open black bullet-journal spread, laid out like a book
// product page (rules, eyebrow, big title, spread bleeding off the left,
// blurb + one button on the right). Left page = index of entries,
// right page = the latest entry, written as bullets.

const entryDate = (p, fmt) => {
  const d = p.date_traveled || p.created_at;
  if (!d) return '';
  try { return format(new Date(d), fmt); } catch { return ''; }
};

// Excerpt → up to 4 bullet lines, one sentence each.
const toBullets = (text = '') =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/[.]$/, ''))
    .filter(Boolean)
    .slice(0, 4);

const href = (p) => `/journal/${p.slug || p.id}`;

function IndexPage({ posts }) {
  return (
    <div className="nb-page nb-page--left">
      <div className="nb-head">
        <span>Index</span>
        <span>{posts.length ? `${posts.length} entries` : ''}</span>
      </div>
      <ul className="nb-key" aria-label="Key">
        <li><b>•</b> entry</li>
        <li><b>○</b> place</li>
        <li><b>–</b> note</li>
      </ul>
      <ul className="nb-index">
        {posts.slice(0, 11).map((p) => (
          <li key={p.id}>
            <Link to={href(p)}>
              <span className="nb-bullet" aria-hidden>•</span>
              <span className="nb-title">{p.title}</span>
              <span className="nb-date">{entryDate(p, 'MM.dd')}</span>
            </Link>
            {p.location && (
              <span className="nb-sub"><span aria-hidden>○</span> {p.city || p.location}</span>
            )}
          </li>
        ))}
      </ul>
      <span className="nb-folio">01</span>
    </div>
  );
}

function LatestPage({ post }) {
  if (!post) {
    return (
      <div className="nb-page nb-page--right">
        <div className="nb-head"><span>Latest</span></div>
        <p className="nb-empty">– nothing written yet</p>
        <span className="nb-folio">02</span>
      </div>
    );
  }
  const bullets = toBullets(post.excerpt);
  return (
    <div className="nb-page nb-page--right">
      <div className="nb-head">
        <span>{entryDate(post, 'EEE · MMM d, yyyy')}</span>
        <span>{post.location || ''}</span>
      </div>
      {post.cover_image && (
        <Link to={href(post)} className="nb-photo" tabIndex={-1} aria-hidden>
          <img src={post.cover_image} alt="" width="600" height="400" decoding="async" />
          <i className="nb-tape" />
        </Link>
      )}
      <h2 className="nb-entry-title">
        <Link to={href(post)}>
          <span aria-hidden>• </span>{post.title}
        </Link>
      </h2>
      {bullets.length > 0 && (
        <ul className="nb-lines">
          {bullets.map((b, i) => (
            <li key={i}><span aria-hidden>–</span>{b}</li>
          ))}
        </ul>
      )}
      <Link to={href(post)} className="nb-more">→ read the full entry</Link>
      <span className="nb-folio">02</span>
    </div>
  );
}

export default function NotebookHero({ posts = [], isLoading }) {
  const latest = posts[0];
  return (
    <section className="nb-hero px-6 md:px-16">
      <div className="nb-top">
        <div className="nb-top-left">
          <Link to="/stories" className="uppercase">Stories →</Link>
        </div>
        <div className="nb-top-right">
          <p className="uppercase nb-eyebrow">jooonbon notebook</p>
          <h1 className="nb-h1">The Journal</h1>
        </div>
      </div>

      <div className="nb-stage">
        <div className={`nb-book ${isLoading ? 'is-loading' : ''}`}>
          <div className="nb-spread">
            <IndexPage posts={posts} />
            <div className="nb-gutter" aria-hidden />
            <LatestPage post={latest} />
          </div>
        </div>

        <aside className="nb-aside">
          <p>
            <em>The Journal</em> is my notebook from the road. Short entries from
            the places I film, written down one bullet at a time.
          </p>
          {latest && (
            <Link to={href(latest)} className="nb-btn">
              Read latest <span>{posts.length} entries</span>
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
