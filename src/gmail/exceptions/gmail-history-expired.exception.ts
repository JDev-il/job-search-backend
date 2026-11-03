/**
 * Gmail answered history.list with 404: it no longer holds history for the
 * stored cursor (it only keeps history for a limited time, about a week, and
 * rejects ids it doesn't know). The mail between the cursor and now can't be
 * read through history any more, so the cursor has to be restarted.
 *
 * Internal only (the webhook is fire-and-forget), so a plain Error rather
 * than an HttpException.
 */
export class GmailHistoryExpiredException extends Error {
  constructor(message = 'Gmail history for the stored cursor has expired') {
    super(message);
    this.name = 'GmailHistoryExpiredException';
  }
}
