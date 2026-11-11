import nodemailer from 'nodemailer';
import { rateLimit, honeypotTripped, tooFast, escapeHtml, isEmail, oneLine } from '../server-lib/rateLimit.js';

// Field length limits (characters). Anything longer is rejected, not truncated,
// so Jon never gets a silently clipped message.
const LIMITS = {
  name: 120,
  email: 254,
  project_type: 120,
  location: 160,
  when: 120,
  message: 5000,
};

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body && typeof req.body === 'object') ? req.body : {};

  // Honeypot / too-fast: silently accept, send nothing. `t` is optional so the
  // current Contact form (which doesn't send it yet) keeps working.
  if (honeypotTripped(body.website) || tooFast(body.t)) {
    return res.status(200).json({ ok: true });
  }

  const rl = rateLimit(req, { scope: 'contact', max: 5, windowMs: 10 * 60 * 1000 });
  if (rl.limited) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const fields = {};
  for (const key of Object.keys(LIMITS)) fields[key] = str(body[key]);

  if (!fields.name || !fields.email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  if (!isEmail(fields.email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  for (const [key, max] of Object.entries(LIMITS)) {
    if (fields[key].length > max) {
      return res.status(400).json({ error: `The ${key.replace('_', ' ')} field is too long.` });
    }
  }

  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPass) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // Header-safe versions (no CR/LF, no quotes that break the display name).
  const nameHeader = oneLine(fields.name).replace(/["\\<>]/g, '');
  const emailHeader = oneLine(fields.email);

  // HTML-escaped versions for the email bodies.
  const h = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, escapeHtml(v)]));
  const messageHtml = h.message.replace(/\n/g, '<br>');
  const mailtoHref = `mailto:${encodeURIComponent(emailHeader)}`;

  // Inquiries from jooonbon.com/weddings get the Vivid Stories confirmation.
  const isVivid = fields.project_type.startsWith('Vivid Stories');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'jooonbon@gmail.com', pass: gmailPass },
  });

  try {
    // Email to Jon
    await transporter.sendMail({
      from: '"Jon Bon Website" <jooonbon@gmail.com>',
      to: 'jooonbon@gmail.com',
      replyTo: { name: nameHeader, address: emailHeader },
      subject: isVivid ? `${oneLine(fields.project_type).replace(/^Vivid Stories · /, '')} inquiry from ${nameHeader}` : `New inquiry from ${nameHeader}`,
      html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #111;">
        <h2 style="font-weight: 300; font-size: 28px; margin-bottom: 24px;">New Inquiry</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 140px;">Name</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${h.name}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="${mailtoHref}" style="color: #111;">${h.email}</a></td></tr>
          ${h.project_type ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Project</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${h.project_type}</td></tr>` : ''}
          ${h.location ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Location</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${h.location}</td></tr>` : ''}
          ${h.when ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">When</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${h.when}</td></tr>` : ''}
          ${h.message ? `<tr><td style="padding: 10px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 10px 0;">${messageHtml}</td></tr>` : ''}
        </table>
        <p style="margin-top: 32px; color: #999; font-size: 13px;">Hit Reply to respond directly to ${h.name}.</p>
      </div>
    `,
    });

    // Confirmation email to the person who submitted
    if (isVivid) {
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(fields.when);
      const niceWhen = iso
        ? new Date(fields.when + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
        : h.when;
      const whenLine = h.when && h.location
        ? `We got your note about ${niceWhen} at ${h.location}.`
        : 'We got your note.';
      await transporter.sendMail({
        from: '"Vivid Stories" <jooonbon@gmail.com>',
        to: emailHeader,
        replyTo: 'jooonbon@gmail.com',
        subject: `We got your inquiry, ${nameHeader}`,
        html: `
      <div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 28px; color: #0d0d0d;">
        <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 28px;"><b>Vivid</b> Stories</p>
        <h2 style="font-weight: 300; font-size: 30px; line-height: 1.15; margin: 0 0 24px;">Thank you, ${h.name}.</h2>
        <p style="font-size: 16px; line-height: 1.7; color: #3a3a3a; margin: 0 0 16px;">
          ${whenLine} We'll check the calendar and email you within 48 hours with a few times for a quick call.
        </p>
        <p style="font-size: 16px; line-height: 1.7; color: #3a3a3a; margin: 0 0 16px;">
          If there's anything you want to add before then, just reply to this email.
        </p>
        <p style="font-size: 16px; line-height: 1.7; color: #3a3a3a; margin: 28px 0 0;">Jon Bon<br>Vivid Stories</p>
        <hr style="border: none; border-top: 1px solid #dcdcdc; margin: 36px 0 16px;" />
        <p style="font-size: 12px; letter-spacing: 0.1em; color: #8a8a8a; margin: 0;">PHOTO + FILM · METRO VANCOUVER, BC · <a href="https://jooonbon.com/weddings" style="color: #8a8a8a;">jooonbon.com/weddings</a></p>
      </div>
    `,
      });
    } else {
      await transporter.sendMail({
        from: '"Jon Bon" <jooonbon@gmail.com>',
        to: emailHeader,
        subject: `Got your inquiry, ${nameHeader}!`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #111;">
          <h2 style="font-weight: 300; font-size: 28px; margin-bottom: 16px;">Thank you, ${h.name}.</h2>
          <p style="font-size: 16px; line-height: 1.7; color: #444;">
            Your inquiry has been received. I'll be in touch within 48 hours to discuss your vision.
          </p>
          <p style="font-size: 16px; line-height: 1.7; color: #444; margin-top: 16px;">
            — Jon Bon
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 12px; color: #999;">jonbontabas.com</p>
        </div>
      `,
      });
    }
  } catch (e) {
    console.error('contact: sendMail failed', e.message);
    return res.status(502).json({ error: 'Could not send your message right now. Please try again later.' });
  }

  return res.status(200).json({ ok: true });
}
