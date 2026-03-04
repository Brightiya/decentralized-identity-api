// backend/src/routes/contact.js
import { Router } from 'express';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }
  if (!email.includes('@') || email.length < 5) {
    return res.status(400).json({ success: false, message: 'Invalid email' });
  }

  try {
    // 1. Email to admin (you)
    const adminEmail = await resend.emails.send({
      from: 'PIMV Contact Form <onboarding@resend.dev>',
      to: [process.env.CONTACT_EMAIL_TO],
      replyTo: email,
      subject: `PIMV Contact: ${subject} from ${name}`,
      html: `
        <h2>New Message via PIMV Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h3>Message:</h3>
        <p style="white-space: pre-wrap; font-family: monospace;">${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <small>Sent: ${new Date().toISOString()} • PIMV Privacy Identity Vault</small>
      `,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\nSent: ${new Date().toISOString()}`,
    });

    if (adminEmail.error) {
      console.error('Admin email failed:', adminEmail.error);
      // Still continue — don't fail user experience
    } else {
      console.log('Admin email sent:', adminEmail.data?.id);
    }

    // 2. Confirmation email to user
    const userConfirmation = await resend.emails.send({
      from: 'PIMV Contact Form <onboarding@resend.dev>',
      to: [email],
      subject: 'Thank you for contacting PIMV!',
      html: `
        <h2>Thank You, ${name}!</h2>
        <p>We have received your message:</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 15px; margin: 20px 0;">
          <p><strong>Subject:</strong> ${subject}</p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </blockquote>
        <p>We will get back to you within 48 hours.</p>
        <p>Best regards,<br>PIMV Team</p>
        <hr>
        <small>Sent via PIMV secure contact form • ${new Date().toISOString()}</small>
      `,
      text: `Thank you, ${name}!\n\nWe received your message:\nSubject: ${subject}\n\n${message}\n\nWe will reply within 48 hours.\n\nBest regards,\nPIMV Team`,
    });

    if (userConfirmation.error) {
      console.error('User confirmation email failed:', userConfirmation.error);
      // Still return success to user — don't expose internal failure
    } else {
      console.log('User confirmation sent:', userConfirmation.data?.id);
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact endpoint error:', err);
    return res.status(500).json({ success: false, message: 'Server error – please try later' });
  }
});

export default router;