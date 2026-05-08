import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailPass) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { name, email, project_type, location, when, message } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'jooonbon@gmail.com', pass: gmailPass },
  });

  // Email to Jon
  await transporter.sendMail({
    from: '"Jon Bon Website" <jooonbon@gmail.com>',
    to: 'jooonbon@gmail.com',
    replyTo: `"${name}" <${email}>`,
    subject: `New inquiry from ${name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #111;">
        <h2 style="font-weight: 300; font-size: 28px; margin-bottom: 24px;">New Inquiry</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 140px;">Name</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${name}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}" style="color: #111;">${email}</a></td></tr>
          ${project_type ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Project</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${project_type}</td></tr>` : ''}
          ${location ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">Location</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${location}</td></tr>` : ''}
          ${when ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">When</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${when}</td></tr>` : ''}
          ${message ? `<tr><td style="padding: 10px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 10px 0;">${message.replace(/\n/g, '<br>')}</td></tr>` : ''}
        </table>
        <p style="margin-top: 32px; color: #999; font-size: 13px;">Hit Reply to respond directly to ${name}.</p>
      </div>
    `,
  });

  // Confirmation email to the person who submitted
  await transporter.sendMail({
    from: '"Jon Bon" <jooonbon@gmail.com>',
    to: email,
    subject: `Got your inquiry, ${name}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #111;">
        <h2 style="font-weight: 300; font-size: 28px; margin-bottom: 16px;">Thank you, ${name}.</h2>
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

  return res.status(200).json({ ok: true });
}
