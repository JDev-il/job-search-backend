export interface GmailTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiry: Date;
}

// Gmail API response shapes
export interface GmailMessageRef {
  id: string;
  threadId: string;
}

export interface GmailMessageListResponse {
  messages?: GmailMessageRef[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType: string;
  headers?: GmailMessageHeader[];
  body?: GmailMessageBody;
  parts?: GmailMessagePart[];
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: GmailMessagePart;
}

// Gmail History API
export interface GmailHistoryMessageAdded {
  message: GmailMessageRef;
}

export interface GmailHistoryRecord {
  id: string;
  messages?: GmailMessageRef[];
  messagesAdded?: GmailHistoryMessageAdded[];
}

export interface GmailHistoryResponse {
  history?: GmailHistoryRecord[];
  historyId: string;
  nextPageToken?: string;
}

// Gmail Watch API
export interface GmailWatchResponse {
  historyId: string;
  expiration: string;
}

interface GmailMessageBody {
  data?: string;
  size: number;
}