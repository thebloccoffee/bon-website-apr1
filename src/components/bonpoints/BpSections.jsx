import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { BRANDS } from '@/lib/brands';
import { PostGrid } from '@/components/shared/PostCard';
import Disclosure from '@/components/shared/Disclosure';
import NewsletterForm from '@/components/shared/NewsletterForm';
import { BP_PILLARS, BP_NEWSLETTER } from './content';

// bon.points v2 motion: "come into focus" = 24px up + blur 12 → 0, expo out.
const EXPO = [0.16, 1, 0.3, 1];
export const focusIn = {
  initial: { opacity: 0, y: 24, filter: 'blur(12px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 1, ease: EXPO },
};

const label = 'font-sans text-tk-md font-medium uppercase tracking-[0.14em] text-[var(--bp-smoke)]';
const h2 = 'font-sans text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.02] text-[var(--bp-bone)]';

/* ── Pill button (bone fill or glass) ─────────────────────────── */
export function BpButton({ to, href, children, glass = false, className = '' }) {
  const cls = `group inline-flex items-center gap-tk-4 rounded-tk-pill pl-tk-6 pr-1.5 py-1.5 font-sans text-tk-lg font-semibold
    transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--bp-bone)] ${
      glass ? 'bp-glass text-[var(--bp-bone)] hover:bg-white/20' : 'bg-[var(--bp-bone)] text-[var(--bp-ink)] hover:bg-[var(--bp-stone)]'
    } ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      <span
        aria-hidden="true"
        className={`grid place-items-center w-9 h-9 rounded-full transition-transform duration-normal group-hover:rotate-45 ${
          glass ? 'bg-[var(--bp-bone)] text-[var(--bp-ink)]' : 'bg-[var(--bp-ink)] text-[var(--bp-bone)]'
        }`}
      >
        <ArrowUpRight className="w-4 h-4" />
      </span>
    </>
  );
  if (href) {
    const ext = href.startsWith('http');
    return (
      <a href={href} className={cls} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  );
}

/* ── Hero: glow + two buttons (logo and intro line removed for now) ── */
export function BpHero() {
  return (
    <section className="relative min-h-[70svh] pt-[104px] flex flex-col items-center justify-center text-center px-tk-6 bg-[var(--bp-ink)] overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_45%,rgb(238_236_232/0.18),transparent_70%)]"
      />
      <h1 className="sr-only">bon.points</h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="relative flex flex-wrap justify-center gap-tk-4"
      >
        <BpButton href={BRANDS.bonpoints.youtube}>Watch on YouTube</BpButton>
        <BpButton href="#newsletter" glass>Get the newsletter</BpButton>
      </motion.div>
    </section>
  );
}

/* ── Disclosures strip (required on every bon.points page) ───── */
export function BpDisclosures() {
  return (
    <div className="bg-[var(--bp-ink)] px-tk-6 md:px-16 pt-tk-8">
      <div className="max-w-6xl mx-auto space-y-tk-3">
        <Disclosure kind="not-advice" />
        <Disclosure kind="affiliate" />
      </div>
    </div>
  );
}

/* ── Videos in glass frames ───────────────────────────────────── */
const watchUrl = (v) =>
  v.format === 'short' ? `https://www.youtube.com/shorts/${v.youtube_id}` : `https://www.youtube.com/watch?v=${v.youtube_id}`;

function BpVideoTile({ video, big }) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${video.youtube_id}/maxresdefault.jpg`);
  return (
    <a
      href={watchUrl(video)}
      target="_blank"
      rel="noopener noreferrer"
      className={`group bp-glass block rounded-[2rem] p-tk-3 ${big ? 'md:col-span-2' : ''}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-[var(--bp-graphite)]">
        <img
          src={src}
          onError={() => setSrc(`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`)}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex items-start justify-between gap-tk-4 px-tk-3 pt-tk-5 pb-tk-3">
        <h3 className="font-sans text-tk-4xl font-semibold tracking-[-0.02em] leading-tight text-[var(--bp-bone)] line-clamp-2">
          {video.title}
        </h3>
        <ArrowUpRight className="shrink-0 w-6 h-6 text-[var(--bp-stone)] transition-transform duration-normal group-hover:rotate-45" aria-hidden="true" />
      </div>
    </a>
  );
}

export function BpVideos({ videos }) {
  if (!videos.length) return null;
  const list = videos.slice(0, 5);
  return (
    <section className="bg-[var(--bp-ink)] py-24 md:py-32 px-tk-6 md:px-16" aria-labelledby="bp-videos-heading">
      <div className="max-w-6xl mx-auto">
        <motion.div {...focusIn} className="flex flex-col md:flex-row md:items-end justify-between gap-tk-6 mb-14">
          <div>
            <p className={`${label} mb-tk-5`}>Videos</p>
            <h2 id="bp-videos-heading" className={h2}>
              Watch it <span className="font-medium italic">explained</span>
            </h2>
          </div>
          <BpButton to="/bonpoints/videos" glass className="self-start md:self-auto">All videos</BpButton>
        </motion.div>
        <motion.div {...focusIn} className={`grid gap-tk-5 ${list.length > 1 ? 'md:grid-cols-2' : 'max-w-3xl'}`}>
          {list.map((v, i) => (
            <BpVideoTile key={v.youtube_id} video={v} big={list.length > 2 && i === 0} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ── What I cover ─────────────────────────────────────────────── */
export function BpPillars() {
  return (
    <section className="bg-[var(--bp-ink)] py-24 md:py-32 px-tk-6 md:px-16" aria-labelledby="bp-pillars-heading">
      <div className="max-w-6xl mx-auto">
        <motion.div {...focusIn} className="max-w-3xl mb-14">
          <p className={`${label} mb-tk-5`}>{BP_PILLARS.eyebrow}</p>
          <h2 id="bp-pillars-heading" className={h2}>{BP_PILLARS.title}</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-tk-5">
          {BP_PILLARS.cards.map((c, i) => (
            <motion.div
              key={c.label}
              {...focusIn}
              transition={{ ...focusIn.transition, delay: i * 0.1 }}
              className="flex flex-col gap-tk-6 min-h-[20rem] rounded-[2.5rem] p-tk-8 md:p-10 bg-[var(--bp-graphite)] border border-[var(--bp-ash)]"
            >
              <span className="self-start bp-glass rounded-full px-tk-5 py-tk-2 font-sans text-tk-md font-medium uppercase tracking-[0.14em] text-[var(--bp-bone)]">
                0{i + 1} · {c.label}
              </span>
              <h3 className="mt-auto font-sans text-3xl md:text-4xl font-semibold tracking-[-0.03em] leading-tight text-[var(--bp-bone)]">
                {c.title}
              </h3>
              <p className="font-sans text-tk-3xl text-[var(--bp-smoke)] leading-relaxed">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Guides ───────────────────────────────────────────────────── */
export function BpGuides({ posts }) {
  if (!posts.length) return null;
  return (
    <section className="bg-[var(--bp-ink)] py-24 md:py-32 px-tk-6 md:px-16" aria-labelledby="bp-guides-heading">
      <div className="max-w-6xl mx-auto">
        <motion.div {...focusIn} className="flex flex-col md:flex-row md:items-end justify-between gap-tk-6 mb-14">
          <div>
            <p className={`${label} mb-tk-5`}>Guides</p>
            <h2 id="bp-guides-heading" className={h2}>Read it <span className="font-medium italic">slowly</span></h2>
          </div>
          <BpButton to="/bonpoints/guides" glass className="self-start md:self-auto">All guides</BpButton>
        </motion.div>
        <PostGrid posts={posts.slice(0, 6)} glass />
      </div>
    </section>
  );
}

/* ── Newsletter ───────────────────────────────────────────────── */
export function BpNewsletter() {
  return (
    <section
      id="newsletter"
      className="relative overflow-hidden bg-[var(--bp-ink)] px-tk-6 md:px-16 py-28 md:py-40 scroll-mt-24"
      aria-labelledby="bp-newsletter-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_45%_55%_at_50%_50%,rgb(238_236_232/0.16),transparent_70%)]"
      />
      <motion.div {...focusIn} className="relative max-w-2xl mx-auto bp-glass rounded-[2.5rem] p-tk-8 md:p-14 text-center">
        <img src="/brands/bonpoints/mark-bone.svg" alt="" className="h-12 w-auto mx-auto mb-tk-7" />
        <p className={`${label} mb-tk-4`}>{BP_NEWSLETTER.eyebrow}</p>
        <h2 id="bp-newsletter-heading" className="font-sans text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-[var(--bp-bone)]">
          {BP_NEWSLETTER.title}
        </h2>
        <p className="mt-tk-4 mb-tk-8 font-sans text-tk-3xl text-[var(--bp-stone)]">{BP_NEWSLETTER.body}</p>
        <div className="text-left">
          <NewsletterForm source="bonpoints-page" brand="bonpoints" />
        </div>
      </motion.div>
    </section>
  );
}
