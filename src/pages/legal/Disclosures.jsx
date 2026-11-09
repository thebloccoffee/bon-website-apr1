/*
 * TEMPLATE: needs Jon's review before launch. Not legal advice.
 * Fill every <ToFill> marker. Keep the partner list current; Competition
 * Bureau guidance expects material connections to be disclosed clearly.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { ToFill } from '@/components/legal/LegalPage';

const sections = [
  {
    id: 'affiliate',
    title: 'Affiliate and referral links',
    body: (
      <>
        <p>
          Some links on this site are affiliate or referral links. If you sign up or buy through one, I may earn a
          commission or points, and it costs you nothing extra. Credit card referral links work this way too: the
          issuer may give me a bonus when you're approved.
        </p>
        <p>
          Pages with these links include a short note that points back here. A commission doesn't change what I
          write about a card or product.
        </p>
      </>
    ),
  },
  {
    id: 'sponsored',
    title: 'Sponsorships and gifted products',
    body: (
      <>
        <p>
          Brands sometimes pay me to make content, or send me gear or trips for free. When a video, post or article
          is sponsored or includes something I was given, I say so in that piece of content.
        </p>
        <p>Current and recent partners: <ToFill>Jon to list partners, or remove this line</ToFill></p>
      </>
    ),
  },
  {
    id: 'not-advice',
    title: 'Not financial advice',
    body: (
      <>
        <p>
          bon.points is about credit cards, points and travel. I share what I've learned and what works for me, but
          I'm not your financial adviser and none of it is financial, tax or legal advice. It doesn't take your
          income, credit history or goals into account.
        </p>
        <p>
          Card offers, fees, earn rates and redemption values change often, sometimes without notice. Check the
          current terms with the issuer before you apply. Opening and closing cards can affect your credit score,
          and carrying a balance usually costs more in interest than the points are worth.
        </p>
      </>
    ),
  },
  {
    id: 'questions',
    title: 'Questions',
    body: (
      <p>
        If you're not sure whether a link or post is sponsored, ask me through the{' '}
        <Link to="/contact">contact form</Link>. More on how the site works is in the{' '}
        <Link to="/terms">Terms of Use</Link>.
      </p>
    ),
  },
];

export default function Disclosures() {
  return (
    <LegalPage
      title="Disclosures"
      intro={<p>How I make money from this site, and why the finance content isn't advice.</p>}
      sections={sections}
    />
  );
}
