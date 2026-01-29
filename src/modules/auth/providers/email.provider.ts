import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export const EMAIL_PROVIDER_TOKEN = 'EMAIL_PROVIDER_TOKEN';

export interface EmailProvider {
    sendEmailVerification(email: string, otp: string): Promise<void>;
    sendPasswordReset(email: string, resetLink: string): Promise<void>;
}

@Injectable()
export class MailtrapEmailProvider implements EmailProvider {
    private apiToken: string;
    private fromEmail: string;
    private fromName: string;

    constructor(configService: ConfigService) {
        this.apiToken = configService.getOrThrow('MAILTRAP_API_TOKEN');
        this.fromEmail = configService.get('MAILTRAP_FROM_EMAIL') || 'hello@demomailtrap.co';
        this.fromName = configService.get('MAILTRAP_FROM_NAME') || 'Snip-it';
    }

    async sendEmailVerification(email: string, otp: string): Promise<void> {
        console.log(`[Email Verification] Sending OTP ${otp} to ${email}`);
        
        try {
            const response = await axios.post(
                'https://send.api.mailtrap.io/api/send',
                {
                    from: { email: this.fromEmail, name: this.fromName },
                    to: [{ email }],
                    subject: 'Email Verification - OTP Code',
                    html: `
                        <h2>Verify Your Email</h2>
                        <p>Your verification code is:</p>
                        <h1 style="letter-spacing: 5px; font-size: 28px;">${otp}</h1>
                        <p>This code expires in 10 minutes.</p>
                    `,
                },
                {
                    headers: {
                        'Api-Token': this.apiToken,
                        'Content-Type': 'application/json',
                    },
                }
            );
            console.log('[Email Verification] ✅ Email sent:', response.data.success);
        } catch (error) {
            console.error('[Email Verification] Failed to send OTP:', error.response?.data || error.message);
            throw error;
        }
    }

    async sendPasswordReset(email: string, resetLink: string): Promise<void> {
        console.log(` [Password Reset] Sending reset link to ${email}: ${resetLink}`);
        
        try {
            const response = await axios.post(
                'https://send.api.mailtrap.io/api/send',
                {
                    from: { email: this.fromEmail, name: this.fromName },
                    to: [{ email }],
                    subject: 'Password Reset Request',
                    html: `
                        <h2>Reset Your Password</h2>
                        <p><a href="${resetLink}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                        <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
                        <p>This link expires in 10 minutes.</p>
                    `,
                },
                {
                    headers: {
                        'Api-Token': this.apiToken,
                        'Content-Type': 'application/json',
                    },
                }
            );
            console.log('[Password Reset] ✅ Email sent:', response.data.success);
        } catch (error) {
            console.error('[Password Reset] Failed to send link:', error.response?.data || error.message);
            throw error;
        }
    }
}
