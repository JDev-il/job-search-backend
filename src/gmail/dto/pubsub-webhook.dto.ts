export interface PubSubMessage {
  data: string;
  messageId: string;
  publishTime: string;
}

export interface PubSubWebhookDto {
  message: PubSubMessage;
  subscription: string;
}

/** Decoded from message.data (base64 → JSON) */
export interface PubSubEmailNotification {
  emailAddress: string;
  historyId: string;
}