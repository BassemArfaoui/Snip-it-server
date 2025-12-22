import { randomBytes, randomInt } from 'crypto';
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthUserDto } from './dto/oauth-user.dto';
import { HashingService } from '../../common/services/hashing.service';
import { JwtService } from '../../common/services/jwt.service';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { type EmailProvider, EMAIL_PROVIDER_TOKEN } from './providers/email.provider';
import { AuthTokens } from './types/auth-tokens.type';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly hashingService: HashingService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectRepository(EmailVerification)
        private readonly emailVerificationRepository: Repository<EmailVerification>,
        @InjectRepository(PasswordReset)
        private readonly passwordResetRepository: Repository<PasswordReset>,
        @Inject(EMAIL_PROVIDER_TOKEN) private readonly emailProvider: EmailProvider,
    ) { }

    async register(registerDto: RegisterDto) {
        const { email, username, password } = registerDto;

        const [existingEmail, existingUsername] = await Promise.all([
            this.usersService.findOneByEmail(email),
            this.usersService.findOneByUsername(username),
        ]);

        if (existingEmail) {
            throw new BadRequestException('Email already exists');
        }

        if (existingUsername) {
            throw new BadRequestException('Username already exists');
        }

        const hashedPassword = await this.hashingService.hash(password);

        const user = await this.usersService.create({
            ...registerDto,
            password: hashedPassword,
            isEmailVerified: false,
            role: 'user',
        });

        await this.sendOtp(user);

        return { message: 'Registration successful. Please verify your email to continue.' };
    }

    async login(loginDto: LoginDto): Promise<AuthTokens> {
        const { identifier, password } = loginDto;

        // Need password for login; password column is select: false
        const user = await this.usersService.findOneByEmailOrUsernameWithPassword(identifier);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await this.hashingService.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isEmailVerified) {
            throw new UnauthorizedException('Please verify your email to login.');
        }

        const tokens = this.generateTokensSync({ id: user.id, username: user.username, email: user.email });
        await this.persistRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    async verifyEmail(verifyEmailDto: VerifyEmailDto) {
        const { email, otp } = verifyEmailDto;
        const user = await this.usersService.findOneByEmail(email);

        if (!user) {
            throw new BadRequestException('Invalid email.');
        }

        if (user.isEmailVerified) {
            return { message: 'Email already verified.' };
        }

        const verification = await this.emailVerificationRepository.findOne({
            where: { user: { id: user.id }, usedAt: IsNull() },
            order: { createdAt: 'DESC' },
        });

        if (!verification) {
            throw new BadRequestException('No active verification request. Please request a new OTP.');
        }

        if (verification.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException('OTP expired. Please request a new one.');
        }

        const isValidOtp = await this.hashingService.compare(otp, verification.otpHash);
        if (!isValidOtp) {
            throw new UnauthorizedException('Invalid OTP.');
        }

        verification.usedAt = new Date();

        await Promise.all([
            this.emailVerificationRepository.save(verification),
            this.usersService.markEmailVerified(user.id),
        ]);

        const tokens = this.generateTokensSync({ id: user.id, username: user.username, email: user.email });
        await this.persistRefreshToken(user.id, tokens.refreshToken);

        return { message: 'Email verified successfully.', tokens };
    }

    async resendOtp(resendOtpDto: ResendOtpDto) {
        const user = await this.usersService.findOneByEmail(resendOtpDto.email);

        if (!user) {
            throw new BadRequestException('Invalid email.');
        }

        if (user.isEmailVerified) {
            return { message: 'Email already verified.' };
        }

        await this.sendOtp(user);

        return { message: 'A new OTP has been sent to your email.' };
    }

    async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
        const { refreshToken } = refreshTokenDto;
        const payload = this.jwtService.verifyRefreshToken(refreshToken);

        const user = await this.usersService.findOneWithRefreshToken(payload.sub);

        if (!user || !user.refreshTokenHash) {
            throw new UnauthorizedException('Invalid refresh token.');
        }

        const isValid = await this.hashingService.compare(refreshToken, user.refreshTokenHash);
        if (!isValid) {
            throw new UnauthorizedException('Invalid refresh token.');
        }

        const tokens = this.generateTokensSync({ id: user.id, email: user.email, username: user.username });
        await this.persistRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    async generateTokens(user: { id: number; username?: string; email: string }): Promise<AuthTokens> {
        const payload = { sub: user.id, username: user.username || user.email, email: user.email };
        const tokens = {
            accessToken: this.jwtService.signAccessToken(payload),
            refreshToken: this.jwtService.signRefreshToken(payload),
        };
        await this.persistRefreshToken(user.id, tokens.refreshToken);
        return tokens;
    }

    private generateTokensSync(user: { id: number; username: string; email: string }): AuthTokens {
        const payload = { sub: user.id, username: user.username, email: user.email };
        return {
            accessToken: this.jwtService.signAccessToken(payload),
            refreshToken: this.jwtService.signRefreshToken(payload),
        };
    }

    private async persistRefreshToken(userId: number, refreshToken: string): Promise<void> {
        const refreshTokenHash = await this.hashingService.hash(refreshToken);
        await this.usersService.updateRefreshToken(userId, refreshTokenHash);
    }

    private async sendOtp(user: User): Promise<void> {
        const otpLength = Number(this.configService.get('OTP_LENGTH') ?? 6);
        const ttlMinutes = Number(this.configService.get('OTP_TTL_MINUTES') ?? 10);
        const otp = this.generateOtp(otpLength);
        const otpHash = await this.hashingService.hash(otp);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        const entity = this.emailVerificationRepository.create({ user, otpHash, expiresAt });
        await this.emailVerificationRepository.save(entity);
        await this.emailProvider.sendEmailVerification(user.email, otp);
    }

    private generateOtp(length: number): string {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i += 1) {
            otp += digits[randomInt(0, digits.length)];
        }
        return otp;
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const { email } = forgotPasswordDto;
        const user = await this.usersService.findOneByEmail(email);

        if (!user) {
            // Don't reveal if email exists for security
            return { message: 'If the email exists, a password reset link has been sent.' };
        }

        await this.sendPasswordResetLink(user);

        return { message: 'If the email exists, a password reset link has been sent.' };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const { email, token, newPassword } = resetPasswordDto;
        const user = await this.usersService.findOneByEmail(email);

        if (!user) {
            throw new BadRequestException('Invalid email or token.');
        }

        const resetRequest = await this.passwordResetRepository.findOne({
            where: { user: { id: user.id }, usedAt: IsNull() },
            order: { createdAt: 'DESC' },
        });

        if (!resetRequest) {
            throw new BadRequestException('No active reset request. Please request a new link.');
        }

        if (resetRequest.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException('Reset link expired. Please request a new one.');
        }

        const isValidToken = await this.hashingService.compare(token, resetRequest.otpHash);
        if (!isValidToken) {
            throw new UnauthorizedException('Invalid or already used reset link.');
        }

        // Hash the new password
        const hashedPassword = await this.hashingService.hash(newPassword);

        // Mark reset as used
        resetRequest.usedAt = new Date();

        await Promise.all([
            this.passwordResetRepository.save(resetRequest),
            this.usersService.updatePassword(user.id, hashedPassword),
            // Invalidate all refresh tokens for security
            this.usersService.updateRefreshToken(user.id, null),
        ]);

        return { message: 'Password reset successfully. Please login with your new password.' };
    }

    private async sendPasswordResetLink(user: User): Promise<void> {
        const ttlMinutes = Number(this.configService.get('OTP_TTL_MINUTES') ?? 10);
        const token = randomBytes(32).toString('hex');
        const tokenHash = await this.hashingService.hash(token);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        const entity = this.passwordResetRepository.create({ user, otpHash: tokenHash, expiresAt });
        await this.passwordResetRepository.save(entity);

        const baseResetUrl = this.configService.get('PASSWORD_RESET_URL') ?? 'http://localhost:4200/reset-password';
        const resetLink = `${baseResetUrl}?token=${token}&email=${encodeURIComponent(user.email)}`;

        await this.emailProvider.sendPasswordReset(user.email, resetLink);
    }

    async validateOrCreateOAuthUser(oauthUserDto: OAuthUserDto): Promise<User> {
        const { oauthId, oauthProvider } = oauthUserDto;

        // Check if user exists by OAuth provider
        let user = await this.usersService.findByOAuth(oauthProvider, oauthId);

        if (user) {
            return user;
        }

        // Check if email exists from regular signup
        user = await this.usersService.findOneByEmail(oauthUserDto.email);

        if (user) {
            // Link OAuth to existing user
            user.oauthProvider = oauthProvider;
            user.oauthId = oauthId;
            return this.usersService.save(user);
        }

        // Create new user from OAuth
        user = await this.usersService.create({
            email: oauthUserDto.email,
            username: await this.generateUniqueUsername(oauthUserDto.fullName),
            fullName: oauthUserDto.fullName,
            imageProfile: oauthUserDto.imageProfile,
            oauthProvider,
            oauthId,
            password: '', // OAuth users don't have passwords
            isEmailVerified: true, // OAuth emails are pre-verified
            emailVerifiedAt: new Date(),
            role: 'user',
        });

        return user;
    }

    private async generateUniqueUsername(baseUsername: string): Promise<string> {
        let username = baseUsername;
        let counter = 1;

        while (await this.usersService.findOneByUsername(username)) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        return username;
    }
}
