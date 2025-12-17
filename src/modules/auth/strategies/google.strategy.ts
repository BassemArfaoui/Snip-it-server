import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
            clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
            scope: ['profile', 'email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<void> {
        const { id, displayName, emails, photos } = profile;
        const email = emails?.[0]?.value;
        const profilePicture = photos?.[0]?.value;

        const user = await this.authService.validateOrCreateOAuthUser({
            oauthId: id,
            oauthProvider: 'google',
            email,
            username: email.split('@')[0],
            fullName: displayName,
            imageProfile: profilePicture,
        });

        done(null, user);
    }
}
