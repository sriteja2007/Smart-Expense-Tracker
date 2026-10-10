import { OAuth2Client, type TokenPayload as GooglePayload } from 'google-auth-library';
import { AppError } from '@lumaspend/shared';
import { env } from '../config/env.js';

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export class GoogleAuthService {
  private static client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

  static async verifyIdToken(idToken: string): Promise<VerifiedGoogleUser> {
    if (!idToken) {
      throw AppError.badRequest('Google ID token is required');
    }

    // DEVELOPMENT & TEST ONLY MOCK GATE:
    // Only permitted if GOOGLE_CLIENT_ID is unconfigured AND environment is explicitly development or test.
    if ((!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID.trim() === '') && (env.NODE_ENV === 'development' || env.NODE_ENV === 'test')) {
      if (idToken.startsWith('mock-google-token:')) {
        const mockEmail = idToken.replace('mock-google-token:', '').trim() || 'developer@lumaspend.local';
        console.warn(
          `\n⚠️  [DEV ONLY GOOGLE MOCK]: Verified development simulated identity for "${mockEmail}". Set GOOGLE_CLIENT_ID in server/.env for live Google Identity Services.\n`
        );
        return {
          googleId: `dev-google-${Buffer.from(mockEmail).toString('hex').substring(0, 12)}`,
          email: mockEmail,
          displayName: 'Google Dev User',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
        };
      }
    }

    // PRODUCTION / LIVE GOOGLE OAUTH VERIFICATION:
    if (!env.GOOGLE_CLIENT_ID) {
      throw AppError.badRequest(
        'Google OAuth client ID is not configured on the server. Please provide GOOGLE_CLIENT_ID in server/.env.'
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID
      });

      const payload: GooglePayload | undefined = ticket.getPayload();

      if (!payload) {
        throw AppError.unauthorized('Invalid Google token: No payload returned');
      }

      // Check Issuer: Must be Google accounts
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!payload.iss || !validIssuers.includes(payload.iss)) {
        throw AppError.unauthorized('Invalid Google token: Untrusted issuer');
      }

      // Check Audience: Must strictly match server GOOGLE_CLIENT_ID
      if (payload.aud !== env.GOOGLE_CLIENT_ID) {
        throw AppError.unauthorized('Invalid Google token: Audience mismatch');
      }

      // Check Email Verification: Never trust unverified emails
      if (!payload.email_verified || !payload.email) {
        throw AppError.unauthorized('Google account email is not verified');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase().trim(),
        displayName: payload.name || payload.email.split('@')[0] || 'Google User',
        avatarUrl: payload.picture
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[Google Verification Failed]:', error);
      throw AppError.unauthorized('Failed to verify Google ID token');
    }
  }
}
