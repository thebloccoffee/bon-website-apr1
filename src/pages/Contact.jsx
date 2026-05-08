import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', project_type: '', location: '', when: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Please fill in your name and email.');
      return;
    }
    setSubmitting(true);
    try {
      await supabase.from('contact_inquiries').insert(form);
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="pt-28 pb-24 px-6 md:px-16 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="font-sans text-3xl md:text-4xl font-light tracking-[-0.02em] mb-4">Thank you</h2>
          <p className="font-serif text-muted-foreground text-lg max-w-md mx-auto">
            Your inquiry has been received. I'll be in touch within 48 hours to discuss your vision.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 px-6 md:px-16 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20"
        >
          <h1 className="font-sans text-4xl md:text-6xl font-light tracking-[-0.02em] leading-[1.1]">
            The Inquiry
          </h1>
          <p className="font-serif text-lg text-muted-foreground mt-4 max-w-lg">
            Every great film begins with a conversation. Tell me about the story you'd like to capture.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="space-y-16"
        >
          <div>
            <label className="font-serif text-xl md:text-2xl text-foreground leading-relaxed">
              My name is{' '}
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="your name"
                className="bg-transparent border-b border-accent focus:border-foreground outline-none transition-colors duration-300 text-foreground font-serif text-xl md:text-2xl placeholder:text-accent/60 w-48 md:w-64 pb-1"
              />
            </label>
          </div>

          <div>
            <label className="font-serif text-xl md:text-2xl text-foreground leading-relaxed">
              and I am looking to document{' '}
              <input
                type="text"
                value={form.project_type}
                onChange={(e) => handleChange('project_type', e.target.value)}
                placeholder="a wedding, a journey, a brand story..."
                className="bg-transparent border-b border-accent focus:border-foreground outline-none transition-colors duration-300 text-foreground font-serif text-xl md:text-2xl placeholder:text-accent/60 w-full md:w-96 pb-1"
              />
            </label>
          </div>

          <div>
            <label className="font-serif text-xl md:text-2xl text-foreground leading-relaxed">
              in{' '}
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="a location or anywhere"
                className="bg-transparent border-b border-accent focus:border-foreground outline-none transition-colors duration-300 text-foreground font-serif text-xl md:text-2xl placeholder:text-accent/60 w-48 md:w-72 pb-1"
              />
            </label>
          </div>

          <div>
            <label className="font-serif text-xl md:text-2xl text-foreground leading-relaxed">
              around{' '}
              <input
                type="text"
                value={form.when}
                onChange={(e) => handleChange('when', e.target.value)}
                placeholder="a date, season, or timeframe"
                className="bg-transparent border-b border-accent focus:border-foreground outline-none transition-colors duration-300 text-foreground font-serif text-xl md:text-2xl placeholder:text-accent/60 w-64 md:w-80 pb-1"
              />
            </label>
          </div>

          <div>
            <label className="font-serif text-xl md:text-2xl text-foreground leading-relaxed">
              You can reach me at{' '}
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="your@email.com"
                className="bg-transparent border-b border-accent focus:border-foreground outline-none transition-colors duration-300 text-foreground font-serif text-xl md:text-2xl placeholder:text-accent/60 w-48 md:w-72 pb-1"
              />
            </label>
          </div>

          <div>
            <p className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
              Anything else I should know
            </p>
            <textarea
              value={form.message}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder="Share any additional details about your vision, timeline, or inspiration..."
              rows={4}
              className="w-full bg-transparent border-b border-accent focus:border-foreground outline-none transition-colors duration-300 text-foreground font-serif text-lg placeholder:text-accent/60 resize-none pb-2"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="font-sans text-xs tracking-[0.3em] uppercase text-foreground border border-foreground px-10 py-4 hover:bg-foreground hover:text-background transition-all duration-500 disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send inquiry'}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
