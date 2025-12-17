export class OAuthUserDto {
    oauthId: string;
    oauthProvider: 'google' | 'github';
    email: string;
    username: string;
    fullName: string;
    imageProfile?: string;
}
