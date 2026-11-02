import { HttpException, HttpStatus } from '@nestjs/common';

export const GMAIL_RECONNECT_REQUIRED = 'GMAIL_RECONNECT_REQUIRED';

/**
 * The user's Gmail connection can't be used any more (never connected, or
 * Google rejected the refresh token) and they have to connect Gmail again.
 *
 * Deliberately a 409, not a 401: the client treats every 401 from this API
 * as "your session expired" and logs the user out (auth.interceptor.ts). A
 * dead Gmail grant says nothing about the user's own login, so it must never
 * look like one.
 */
export class GmailReconnectRequiredException extends HttpException {
  constructor(message = 'Gmail needs to be reconnected') {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: GMAIL_RECONNECT_REQUIRED,
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}
