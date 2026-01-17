import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { AppError } from '../middleware/error.middleware';

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const defaultFrom = process.env.SMTP_FROM || 'no-reply@podm.app';

if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('SMTP configuration is missing. Email sending will fail.');
}

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
});

/**
 * Sends an email using the configured SMTP server.
 * @param to - Recipient email address.
 * @param subject - Email subject.
 * @param text - Plain text body.
 * @param html - HTML body (optional).
 * @param from - Custom sender address (optional).
 * @param replyTo - Reply-To address (optional).
 */
export const sendEmail = async (
    to: string,
    subject: string,
    text: string,
    html?: string,
    from?: string,
    replyTo?: string
) => {
    try {
        const mailOptions = {
            from: from || defaultFrom,
            to,
            subject,
            text,
            html,
            replyTo: replyTo // This ensures replies go to the real email
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error: any) {
        console.error('Error sending email:', error);
        throw new AppError(`Failed to send email: ${error.message}`, 500);
    }
};
