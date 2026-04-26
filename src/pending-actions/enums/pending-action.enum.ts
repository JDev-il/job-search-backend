export enum PendingActionType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  AUTO_CREATE_APPLICATION = 'AUTO_CREATE_APPLICATION',
  LINK_THREAD_TO_APPLICATION = 'LINK_THREAD_TO_APPLICATION',
  DRAFT_FOLLOW_UP = 'DRAFT_FOLLOW_UP',
}

export enum PendingActionResolution {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
