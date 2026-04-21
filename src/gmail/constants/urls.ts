const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export const GMAIL_URLS = {
  SCOPE: 'https://www.googleapis.com/auth/gmail.readonly',
  API_BASE: GMAIL_API_BASE,
  WATCH: `${GMAIL_API_BASE}/watch`,
  PROFILE: `${GMAIL_API_BASE}/profile`,
  MESSAGES: `${GMAIL_API_BASE}/messages`,
}