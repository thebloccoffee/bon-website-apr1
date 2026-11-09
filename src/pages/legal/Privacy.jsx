/*
 * TEMPLATE: needs Jon's review before launch. Not legal advice.
 * Written to match how the site works on 2026-11-08 (Supabase, Vercel,
 * Gmail for the contact form, Stripe Payment Links, Metricool after consent,
 * Vercel Web Analytics). Update it when any of those change, and fill every
 * <ToFill> marker.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { ToFill } from '@/components/legal/LegalPage';
import { resetCookieConsent } from '@/components/CookieBanner';

const sections = [
  {
    id: 'who',
    title: 'Who runs this site',
    body: (
      <>
        <p>
          This site (tabasjonbon.com) is run by Jon Bon Tabas, a creator based in Vancouver, British Columbia,
          Canada. It covers two brands: jooonbon (travel films) and bon.points (credit cards, points and travel
          tips). In this policy, "I" and "me" mean Jon Bon Tabas.
        </p>
        <p>
          I am responsible for the personal information collected here and handle it under Canada's Personal
          Information Protection and Electronic Documents Act (PIPEDA). For any privacy question or request,
          use the <Link to="/contact">contact form</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'What I collect and why',
    body: (
      <>
        <p><strong>Contact form.</strong> Your name, email address and whatever you write in the form (project type, location, dates, message). I use it to reply to you and to send you one confirmation email.</p>
        <p><strong>Newsletter.</strong> Your email address, which newsletter you joined (jooonbon or bon.points), the page you signed up from, the exact consent wording you agreed to and the date and time. I use it to send you that newsletter and to keep a record that you asked for it, which Canada's Anti-Spam Legislation (CASL) requires.</p>
        <p><strong>Purchases.</strong> Payments for digital products go through Stripe. Stripe collects your card details; I never see your full card number. Stripe shares with me what a seller normally receives: your name, email address, billing country, what you bought and the amount paid. I use this to deliver your files, answer support questions, handle refunds and keep tax records.</p>
        <p><strong>Analytics.</strong> If you accept analytics in the banner, the site loads Metricool, which records the page address, the page that sent you here, your screen size and your IP address (every web request carries one). The site may also use Vercel Web Analytics, which counts page views without cookies and without storing your IP address. I use both to see which pages and videos people read and watch.</p>
        <p><strong>Server logs.</strong> The hosting provider, Vercel, keeps short-lived technical logs (such as IP address, browser type and the page requested) to run the site and block abuse.</p>
        <p>I don't sell personal information, and I don't use it for advertising profiles.</p>
      </>
    ),
  },
  {
    id: 'where',
    title: 'Where it is stored',
    body: (
      <>
        <p>I use these service providers. Each one only processes your information to provide its service to me.</p>
        <ul>
          <li>Supabase: the site database (contact form entries, newsletter signups, orders and download access).</li>
          <li>Vercel: hosting and the site's server functions.</li>
          <li>Google (Gmail): contact form messages and replies.</li>
          <li>Stripe: payments and receipts.</li>
          <li>Metricool: analytics, only after you accept.</li>
          <li>Email newsletter tool: <ToFill>Jon to name the tool before the first newsletter goes out</ToFill></li>
        </ul>
        <p>
          These providers may store or process information outside Canada, including in the United States. When
          that happens, the information is subject to the laws of that country, and authorities there may be able to
          access it.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long I keep it',
    body: (
      <ul>
        <li>Contact form entries: <ToFill>Jon to confirm, e.g. 2 years after our last message</ToFill>.</li>
        <li>Newsletter: until you unsubscribe. After that I keep your email address, consent record and unsubscribe date so I don't email you again and can show what you agreed to.</li>
        <li>Purchase records: as long as Canadian tax law requires, generally six years after the end of the tax year.</li>
        <li>Analytics: as set by Metricool and Vercel. <ToFill>Jon to confirm retention settings</ToFill>.</li>
      </ul>
    ),
  },
  {
    id: 'rights',
    title: 'Your choices and rights',
    body: (
      <>
        <p>You can ask me to:</p>
        <ul>
          <li>tell you what personal information I hold about you and give you a copy;</li>
          <li>correct anything that is wrong;</li>
          <li>withdraw your consent, for example to stop newsletter emails or analytics, and delete what I no longer need to keep.</li>
        </ul>
        <p>
          Send the request through the <Link to="/contact">contact form</Link>. I will reply within 30 days, as
          PIPEDA requires. I may need to confirm it's really you before sharing anything. Some records, such as tax
          records for purchases, I have to keep even after you ask.
        </p>
        <p>
          Every newsletter email will include an unsubscribe link. You can also unsubscribe through the contact form.
          To turn analytics off, clear this site's data in your browser and choose Decline when the banner appears.
        </p>
        <p>
          If you're not happy with how I handled your request, you can complain to the Office of the Privacy
          Commissioner of Canada at <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">priv.gc.ca</a>.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    body: (
      <>
        <p>The site keeps a few small items in your browser:</p>
        <ul>
          <li>Your analytics choice (accept or decline), so the banner doesn't keep asking.</li>
          <li>Your light or dark theme setting.</li>
          <li>The time you last sent the contact form, to slow down repeated submissions.</li>
          <li>An admin login cookie, which only exists for Jon when he signs in to manage the site.</li>
        </ul>
        <p>
          Metricool loads only after you accept analytics. Vercel Web Analytics doesn't use cookies.{' '}
          <button type="button" onClick={resetCookieConsent} className="underline underline-offset-2 hover:text-foreground">
            Change your analytics choice
          </button>
          . If you had accepted, reload the page after declining to stop Metricool.
        </p>
        <p>
          Some pages embed videos from YouTube or Vimeo. When you play one, that company may set its own cookies and
          collect information under its own privacy policy.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        The site runs over HTTPS. The database only lets the public read published content, and forms are checked on
        the server before anything is saved. No system is perfectly secure, so I can't promise that information will
        never be exposed. If a breach puts you at real risk of significant harm, I will tell you and the Privacy
        Commissioner, as the law requires.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        This site is meant for adults. I don't knowingly collect information from children under 13. If you think a
        child has sent me their information, contact me and I will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        When this policy changes, I will update the date at the top of the page. If a change affects how I use
        information you already gave me, I will ask for your consent again where the law requires it.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={<p>What this site collects, why, where it goes and how you can get it changed or removed.</p>}
      sections={sections}
    />
  );
}
