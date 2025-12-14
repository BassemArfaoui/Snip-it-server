export const EMAIL_PROVIDER_TOKEN = 'EMAIL_PROVIDER_TOKEN';

export interface EmailProvider {
    sendEmailVerification(email: string, otp: string): Promise<void>;
    sendPasswordReset(email: string, resetLink: string): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
    async sendEmailVerification(email: string, otp: string): Promise<void> {
        // In production, replace with real provider (SES, SendGrid, etc.)
        // Logging here keeps the abstraction without coupling.
        // eslint-disable-next-line no-console
        console.log(`[Email Verification] Sending OTP ${otp} to ${email}`);
    }

    async sendPasswordReset(email: string, resetLink: string): Promise<void> {
        // In production, replace with real provider (SES, SendGrid, etc.)
        // eslint-disable-next-line no-console
        console.log(` [Password Reset] Sending reset link to ${email}: ${resetLink}`);
    }
}
