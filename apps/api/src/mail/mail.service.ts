import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter | null = null;
    private readonly mailFrom: string;

    constructor(private configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST') || this.configService.get<string>('MAIL_HOST');
        const port = this.configService.get<number>('SMTP_PORT') || this.configService.get<number>('MAIL_PORT');
        const user = this.configService.get<string>('SMTP_USER') || this.configService.get<string>('MAIL_USER');
        const pass = this.configService.get<string>('SMTP_PASS') || this.configService.get<string>('MAIL_PASS');
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

    async sendPaymentSuccessEmail(params: {
        to: string;
        displayName: string;
        planName: string;
        amount: number;
        billingCycle: 'monthly' | 'annual';
        endDate: Date;
        transactionId: string;
    }): Promise<void> {
        const html = `
            <h2>Thanh toán thành công</h2>
            <p>Xin chào ${this.escapeHtml(params.displayName)},</p>
            <p>Gói <strong>${this.escapeHtml(params.planName)}</strong> của bạn đã được kích hoạt.</p>
            <table>
                <tr><td>Số tiền:</td><td>${this.formatMoney(params.amount)}</td></tr>
                <tr><td>Chu kỳ:</td><td>${params.billingCycle === 'annual' ? 'Hàng năm' : 'Hàng tháng'}</td></tr>
                <tr><td>Hiệu lực đến:</td><td>${this.formatDate(params.endDate)}</td></tr>
                <tr><td>Mã giao dịch:</td><td>${this.escapeHtml(params.transactionId)}</td></tr>
            </table>
        `;

        await this.sendMail(params.to, 'Netflat - Xác nhận thanh toán', html);
    }

    async sendSubscriptionExpiringEmail(params: {
        to: string;
        displayName: string;
        planName: string;
        endDate: Date;
        renewUrl: string;
    }): Promise<void> {
        const html = `
            <h2>Gói cước sắp hết hạn</h2>
            <p>Xin chào ${this.escapeHtml(params.displayName)},</p>
            <p>Gói <strong>${this.escapeHtml(params.planName)}</strong> của bạn sẽ hết hạn vào
            <strong>${this.formatDate(params.endDate)}</strong>.</p>
            <p><a href="${this.escapeAttribute(params.renewUrl)}">Gia hạn ngay</a></p>
        `;

        await this.sendMail(params.to, 'Netflat - Gói cước sắp hết hạn', html);
    }

    async sendSubscriptionExpiredEmail(params: {
        to: string;
        displayName: string;
        upgradeUrl: string;
    }): Promise<void> {
        const html = `
            <h2>Gói cước đã hết hạn</h2>
            <p>Xin chào ${this.escapeHtml(params.displayName)},</p>
            <p>Tài khoản của bạn đã được chuyển về gói <strong>Free</strong>.</p>
            <p><a href="${this.escapeAttribute(params.upgradeUrl)}">Nâng cấp lại</a></p>
        `;

        await this.sendMail(params.to, 'Netflat - Gói cước đã hết hạn', html);
    }

    async sendSubscriptionCanceledEmail(params: {
        to: string;
        displayName: string;
        planName: string;
        endDate: Date;
        renewUrl: string;
    }): Promise<void> {
        const html = `
            <h2>Đã hủy gia hạn gói cước</h2>
            <p>Xin chào ${this.escapeHtml(params.displayName)},</p>
            <p>Gói <strong>${this.escapeHtml(params.planName)}</strong> vẫn dùng được đến
            <strong>${this.formatDate(params.endDate)}</strong>.</p>
            <p><a href="${this.escapeAttribute(params.renewUrl)}">Quản lý gói cước</a></p>
        `;

        await this.sendMail(params.to, 'Netflat - Đã hủy gia hạn gói cước', html);
    }

    private formatMoney(amount: number) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    }

    private formatDate(value: Date) {
        return value.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    }

    private escapeHtml(value: string) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private escapeAttribute(value: string) {
        return this.escapeHtml(value);
    }
}
