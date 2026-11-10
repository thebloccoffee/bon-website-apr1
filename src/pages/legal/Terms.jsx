/*
 * TEMPLATE: needs Jon's review before launch. Not legal advice.
 * Fill every <ToFill> marker. Licence terms for products should match what
 * each product page says (e.g. LUT packs: personal + client work, no resale).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { ToFill } from '@/components/legal/LegalPage';

const sections = [
  {
    id: 'agreement',
    title: 'Using this site',
    body: (
      <p>
        jooonbon.com is run by Jon Bon Tabas in Vancouver, British Columbia, Canada ("I", "me"). By using the site
        or buying something from it, you agree to these terms. If you don't agree, please don't use the site.
      </p>
    ),
  },
  {
    id: 'content',
    title: 'My content',
    body: (
      <>
        <p>
          The films, photos, writing, guides and designs on this site belong to me unless I say otherwise. You're
          welcome to share links to them. Please don't copy, re-upload or sell them, or use them to train AI models,
          without my written permission.
        </p>
        <p>
          Brand names and logos of other companies mentioned on the site belong to their owners. Mentioning them
          doesn't mean they endorse me or this site.
        </p>
      </>
    ),
  },
  {
    id: 'info',
    title: 'Travel, card and finance information',
    body: (
      <>
        <p>
          bon.points content is general education about credit cards, points and travel. It's not financial, tax
          or legal advice, and it doesn't consider your personal situation. Card offers, fees, points values and
          travel rules change often, so check the details with the issuer, airline or hotel before you apply or book.
          For decisions about your own money, talk to a qualified professional. See <Link to="/disclosures">Disclosures</Link>.
        </p>
        <p>
          Travel content reflects my own trips at the time I made it. Prices, opening hours and local rules may have
          changed since.
        </p>
      </>
    ),
  },
  {
    id: 'purchases',
    title: 'Digital products',
    body: (
      <>
        <p>
          Products in the shop are digital files, for example colour-grading LUTs. Prices are in Canadian dollars unless
          shown otherwise. Payment is handled by Stripe, and you'll get access to your files once payment goes through.
        </p>
        <p>
          When you buy a product, you get a personal, non-transferable licence to use the files. Unless the product
          page says otherwise, you may use them in your own projects and in work you make for clients. You may not
          resell, share, give away or re-upload the files themselves, alone or bundled with other products. <ToFill>Jon to confirm licence scope</ToFill>
        </p>
        <p>Refunds are covered by the <Link to="/refunds">Refund Policy</Link>.</p>
      </>
    ),
  },
  {
    id: 'links',
    title: 'Links to other sites',
    body: (
      <p>
        The site links to other websites, including card issuers, booking sites, YouTube and Instagram. I don't
        control them and I'm not responsible for their content or how they handle your information. Some links are
        affiliate or referral links; see <Link to="/disclosures">Disclosures</Link>.
      </p>
    ),
  },
  {
    id: 'conduct',
    title: 'Acceptable use',
    body: (
      <p>
        Please don't try to break, overload or get unauthorised access to the site, scrape it in bulk, or use the
        forms to send spam. I may block access for anyone who does.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'No warranty and limits on liability',
    body: (
      <>
        <p>
          I try to keep the site accurate and working, but it's provided as is. I don't promise it will always be
          available, error-free or up to date.
        </p>
        <p>
          To the extent the law allows, I'm not liable for indirect or consequential losses from using the site or
          relying on its content. If I am found liable for something, my total liability is limited to the amount
          you paid me for the product involved. Nothing in these terms limits rights you have under consumer
          protection law that can't be waived.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <p>
        These terms are governed by the laws of British Columbia and the federal laws of Canada that apply there.
        Disputes go to the courts of British Columbia, unless your local consumer law gives you the right to use
        your own courts.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: (
      <>
        <p>
          I may update these terms. The date at the top shows the latest version, and purchases are covered by the
          version in place when you bought.
        </p>
        <p>Questions go through the <Link to="/contact">contact form</Link>.</p>
        <p>Business registration details: <ToFill>Jon to add business name / registration if any, or remove this line</ToFill></p>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={<p>The rules for using jooonbon.com and buying from the shop.</p>}
      sections={sections}
    />
  );
}
