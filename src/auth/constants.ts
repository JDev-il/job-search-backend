export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
// Removed: unused hardcoded jwtConstants.secret. JwtStrategy and AuthModule
// both read the real signing secret from JWT_SECRET_KEY via ConfigService —
// this constant was never imported anywhere and only sat here as a decoy.