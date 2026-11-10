/*
 * TEMPLATE: needs Jon's review before launch. Not legal advice.
 * Fill every <ToFill> marker. The refund window must match what the shop
 * and product pages say.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { ToFill } from '@/components/legal/LegalPage';

const sections = [
  {
    id: 'digital',
    title: 'Digital files',
    body: (
      <p>
        Everything in the shop is a digital download, such as LUT packs. Once you've downloaded a file you have a
        full copy of it, so I can't take it back. Because of that, sales are usually final once the files have been
        downloaded. The cases below are the exceptions.
      </p>
    ),
  },
  {
    id: 'when',
    title: 'When you can get a refund',
    body: (
      <>
        <p>
          Contact me within <ToFill>Jon to set N</ToFill> days of buying if any of these happened:
        </p>
        <ul>
          <li>The files won't download, or they're damaged and a fresh download doesn't fix it.</li>
          <li>You got something different from what the product page described.</li>
          <li>You were charged twice for the same order.</li>
          <li>You bought by mistake and haven't downloaded the files yet.</li>
        </ul>
        <p>
          If a file doesn't work in your editing software, tell me what you're using first. Most problems are a
          settings issue I can help with, and if I can't fix it, I'll refund you.
        </p>
      </>
    ),
  },
  {
    id: 'how',
    title: 'How to ask',
    body: (
      <>
        <p>
          Send a message through the <Link to="/contact">contact form</Link> with the email you used at checkout,
          your order date and what went wrong. I'll reply within a few business days.
        </p>
        <p>
          Approved refunds go back to your original payment method through Stripe. Your bank may take 5 to 10
          business days to show it.
        </p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your legal rights',
    body: (
      <p>
        This policy doesn't take away any rights you have under consumer protection law where you live. If the law
        gives you a stronger right to a refund, that right applies.
      </p>
    ),
  },
];

export default function Refunds() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={<p>How refunds work for digital products bought on jooonbon.com.</p>}
      sections={sections}
    />
  );
}
