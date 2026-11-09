import React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { faqItems } from './shopMeta';

// FAQPage structured data for the product's FAQ (passed to Seo jsonLd).
export function faqJsonLd(product) {
  const items = faqItems(product);
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export default function ProductFaq({ product }) {
  const items = faqItems(product);
  if (!items.length) return null;
  return (
    <section aria-labelledby="product-faq" className="mt-tk-8">
      <h2 id="product-faq" className="font-sans text-tk-xs tracking-[0.2em] uppercase text-muted-foreground mb-tk-2">
        Questions
      </h2>
      <Accordion type="single" collapsible>
        {items.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="font-sans text-tk-md font-light text-left">{f.q}</AccordionTrigger>
            <AccordionContent className="font-serif text-tk-md text-muted-foreground leading-relaxed whitespace-pre-line">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
