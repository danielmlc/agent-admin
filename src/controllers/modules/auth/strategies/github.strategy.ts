import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@app/config';

export interface GithubProfile {
  provider: string;
  providerId: string;
  username: string;
  email: string | null;
  avatar: string | null;
  accessToken: string;
  profile: any;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly configService: ConfigService) {
    const oauthConfig = configService.get('oauth.github', {
      clientId: '',
      clientSecret: '',
      callbackUrl: '',
    });

    super({
      clientID: oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      callbackURL: oauthConfig.callbackUrl,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<GithubProfile> {
    return {
      provider: 'github',
      providerId: String(profile.id),
      username: profile.username || profile.displayName,
      email: profile.emails?.[0]?.value || null,
      avatar: profile.photos?.[0]?.value || null,
      accessToken,
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        profileUrl: profile.profileUrl,
        emails: profile.emails,
        photos: profile.photos,
      },
    };
  }
}
