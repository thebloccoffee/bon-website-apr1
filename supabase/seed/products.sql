-- Two DRAFT products, one per brand, for trying the admin editor and the
-- product page. Drafts never show on /shop. Copy, prices and Stripe IDs are
-- placeholders: fill them in from /admin before publishing.
-- Idempotent: re-running leaves existing rows alone.

insert into shop_products
  (slug, title, subtitle, description, category, brand, price_formatted,
   features, faq, stripe_price_id, checkout_url, status, featured, "order")
values
  ('jooonbon-lut-pack-1',
   'LUT Pack 1',
   'Placeholder subtitle',
   'Placeholder description. Markdown works here: **bold**, lists and links.',
   'lut', 'jooonbon', null,
   array['Placeholder: what is included'],
   '[{"q": "Which editing apps does it work in?", "a": "Placeholder answer."}]'::jsonb,
   null, null, 'draft', false, 1),
  ('bonpoints-guide-1',
   'bon.points guide (placeholder)',
   'Placeholder subtitle',
   'Placeholder description.',
   'guide', 'bonpoints', null,
   array['Placeholder: what is included'],
   '[]'::jsonb,
   null, null, 'draft', false, 2)
on conflict (slug) do nothing;
