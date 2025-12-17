import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

type VerifyCallback = (err: any, user?: any, info?: any) => void;

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(
        configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            clientID: configService.getOrThrow('GITHUB_CLIENT_ID'),
            clientSecret: configService.getOrThrow('GITHUB_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('GITHUB_CALLBACK_URL'),
            scope: ['user:email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<void> {
        const { id, login, displayName, emails, photos } = profile;
        const email = emails?.[0]?.value || `${login}@github.local`;
        const profilePicture = photos?.[0]?.value;

        const user = await this.authService.validateOrCreateOAuthUser({
            oauthId: id.toString(),
            oauthProvider: 'github',
            email,
            username: login,
            fullName: displayName || login,
            imageProfile: profilePicture,
        });

        done(null, user);
    }
}
