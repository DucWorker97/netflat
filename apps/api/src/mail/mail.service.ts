import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter | null = null;
    private readonly mailFrom: string;

    constructor(private configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT');
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');
        this.mailFrom = this.configService.get<string>('MAIL_FROM') || 'noreply@netflat.local';

        if (host) {
            this.transporter = nodemailer.createTransport({
                host,
                port: port || 587,
                secure: port === 465,
                auth: user ? { user, pass } : undefined,
            });
            this.logger.log(`Mail transport configured: ${host}:${port || 587}`);
        } else {
            this.logger.warn('SMTP_HOST not set – emails will be logged to console only');
        }
    }

    async sendMail(to: string, subject: string, html: string): Promise<void> {
        if (this.transporter) {
            await this.transporter.sendMail({
                from: this.mailFrom,
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent to ${to}: ${subject}`);
        } else {
            this.logger.log(`[DEV-MAIL] To: ${to} | Subject: ${subject}\n${html}`);
        }
    }

    async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        const html = `
            <h2>Password Reset</h2>
            <p>You requested a password reset for your Netflat account.</p>
            <p>Click the link below to reset your password (valid for 1 hour):</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>If you did not request this, you can safely ignore this email.</p>
        `;

        await this.sendMail(to, 'Netflat - Password Reset', html);
    }
}
