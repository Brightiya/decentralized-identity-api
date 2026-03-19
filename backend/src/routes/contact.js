// backend/src/routes/contact.js

// Import Express Router to define modular route handlers
import { Router } from 'express';

// Import Resend SDK for sending transactional emails
import { Resend } from 'resend';

// Import dotenv to load environment variables from .env files
import dotenv from 'dotenv';

// Load environment variables into process.env
dotenv.config();

// Initialize an Express router instance
const router = Router();

// Initialize Resend email client using API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);


// ────────────────────────────────────────────────
// POST /api/contact
// ────────────────────────────────────────────────
// Description:
// Handles contact form submissions from users.
// Performs input validation, sends an email to the administrator,
// and sends a confirmation email back to the user.
//
// Endpoint is designed to:
// 1. Ensure required fields are provided
// 2. Validate basic email format
// 3. Send notification email to admin
// 4. Send confirmation email to user
// 5. Handle errors gracefully without exposing sensitive details
router.post('/api/contact', async (req, res) => {

  // Destructure expected fields from the request body
  const { name, email, subject, message } = req.body;

  // ────────────────────────────────────────────────
  // Input Validation
  // ────────────────────────────────────────────────

  // Check if all required fields are present
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields required' 
    });
  }

  // Basic email validation (simple format check)
  if (!email.includes('@') || email.length < 5) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email' 
    });
  }

  try {
    // ────────────────────────────────────────────────
    // 1. Send Email to Administrator
    // ────────────────────────────────────────────────
    // Purpose:
    // Notify system administrator of a new contact request.
    // The replyTo field allows direct response to the user.

    const adminEmail = await resend.emails.send({
      from: 'PIMV Contact Form <onboarding@resend.dev>', // Sender identity
      to: [process.env.CONTACT_EMAIL_TO],               // Admin email from env config
      replyTo: email,                                  // Allows admin to reply directly to user
      subject: `PIMV Contact: ${subject} from ${name}`, // Dynamic subject line

      // HTML version of the email (rich formatting)
      html: `
        <h2>New Message via PIMV Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h3>Message:</h3>
        <p style="white-space: pre-wrap; font-family: monospace;">
          ${message.replace(/\n/g, '<br>')}
        </p>
        <hr>
        <small>
          Sent: ${new Date().toISOString()} • PIMV Privacy Identity Vault
        </small>
      `,

      // Plain text version (fallback for email clients without HTML support)
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\nSent: ${new Date().toISOString()}`,
    });

    // Check if sending to admin failed
    if (adminEmail.error) {
      console.error('Admin email failed:', adminEmail.error);

      // Important design decision:
      // Do NOT fail the request — avoid degrading user experience
    } else {
      console.log('Admin email sent:', adminEmail.data?.id);
    }


    // ────────────────────────────────────────────────
    // 2. Send Confirmation Email to User
    // ────────────────────────────────────────────────
    // Purpose:
    // Provide feedback to the user confirming receipt of their message.
    // Enhances usability and trust in the system.

    const userConfirmation = await resend.emails.send({
      from: 'PIMV Contact Form <onboarding@resend.dev>', // Same sender identity
      to: [email],                                      // Send to user email
      subject: 'Thank you for contacting PIMV!',

      // HTML email content
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
        <small>
          Sent via PIMV secure contact form • ${new Date().toISOString()}
        </small>
      `,

      // Plain text fallback version
      text: `Thank you, ${name}!\n\nWe received your message:\nSubject: ${subject}\n\n${message}\n\nWe will reply within 48 hours.\n\nBest regards,\nPIMV Team`,
    });

    // Check if confirmation email failed
    if (userConfirmation.error) {
      console.error('User confirmation email failed:', userConfirmation.error);

      // Again, do NOT expose this failure to the user
    } else {
      console.log('User confirmation sent:', userConfirmation.data?.id);
    }


    // ────────────────────────────────────────────────
    // Final Response
    // ────────────────────────────────────────────────
    // If both operations complete (even with partial failure),
    // return success to maintain good user experience.

    return res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully!' 
    });

  } catch (err) {
    // ────────────────────────────────────────────────
    // Error Handling
    // ────────────────────────────────────────────────
    // Catch unexpected errors (e.g., network issues, API failure)

    console.error('Contact endpoint error:', err);

    return res.status(500).json({ 
      success: false, 
      message: 'Server error – please try later' 
    });
  }
});


// Export the router to be mounted in the main application (e.g., index.js)
export default router;