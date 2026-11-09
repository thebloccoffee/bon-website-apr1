import React from 'react';
import BrandPage from '@/components/home/BrandPage';
import { BonpointsWordmark } from '@/components/shared/BrandDoor';
import Disclosure from '@/components/shared/Disclosure';
import NewsletterForm from '@/components/shared/NewsletterForm';

export default function Bonpoints() {
  return (
    <div className="bg-background text-foreground font-sans">
      <BrandPage
        brand="bonpoints"
        glass
        title={<BonpointsWordmark />}
        intro={
          <p>
            An accountant who travels on points. Credit cards, finance and travel tips for Canadians, with a lot of
            Amex Membership Rewards.
          </p>
        }
        top={
          <div className="px-tk-6 md:px-16 mt-tk-8">
            <div className="max-w-6xl mx-auto space-y-tk-3">
              <Disclosure kind="not-advice" />
              <Disclosure kind="affiliate" />
            </div>
          </div>
        }
        bottom={
          <section id="newsletter" className="px-tk-6 md:px-16 py-16 md:py-24 scroll-mt-24" aria-labelledby="bp-newsletter-heading">
            <div className="max-w-6xl mx-auto">
              <div className="bp-glass rounded-tk-xs p-tk-7 md:p-12 max-w-2xl">
                <p className="font-sans text-tk-md tracking-[0.3em] uppercase text-tk-text-tertiary mb-tk-4">
                  Newsletter
                </p>
                <h2 id="bp-newsletter-heading" className="font-sans text-tk-4xl md:text-4xl font-semibold tracking-[-0.02em] mb-tk-6">
                  Get bon.points by email
                </h2>
                <NewsletterForm source="bonpoints-page" brand="bonpoints" />
              </div>
            </div>
          </section>
        }
      />
    </div>
  );
}
