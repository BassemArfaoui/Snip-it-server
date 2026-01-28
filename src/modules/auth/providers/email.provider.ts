import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export const EMAIL_PROVIDER_TOKEN = 'EMAIL_PROVIDER_TOKEN';

export interface EmailProvider {
    sendEmailVerification(email: string, otp: string): Promise<void>;
    sendPasswordReset(email: string, resetLink: string): Promise<void>;
}

@Injectable()
export class GmailEmailProvider implements EmailProvider {
    private transporter: nodemailer.Transporter;

    constructor(configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: configService.get('GMAIL_USER'),
                pass: configService.get('GMAIL_PASSWORD'),
            },
        });
    }

    async sendEmailVerification(email: string, otp: string): Promise<void> {
        console.log(`[Email Verification] Sending OTP ${otp} to ${email}`);
        
        await this.transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Email Verification - OTP Code',
            html: `
                <h2>Verify Your Email</h2>
                <p>Your verification code is:</p>
                <h1 style="letter-spacing: 5px; font-size: 28px;">${otp}</h1>
                <p>This code expires in 10 minutes.</p>
            `,
        });
    }

    async sendPasswordReset(email: string, resetLink: string): Promise<void> {
        console.log(` [Password Reset] Sending reset link to ${email}: ${resetLink}`);
        
        await this.transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Reset Your Password</h2>
                <p><a href="${resetLink}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
                <p>This link expires in 10 minutes.</p>
            `,
        });
    }
}
