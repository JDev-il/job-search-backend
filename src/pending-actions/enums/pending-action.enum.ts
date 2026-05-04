export enum PendingActionType {
  StatusChange = 'STATUS_CHANGE',
  AutoCreateApplication = 'AUTO_CREATE_APPLICATION',
  LinkThreadToApplication = 'LINK_THREAD_TO_APPLICATION',
  DraftFollowUp = 'DRAFT_FOLLOW_UP',
}

export enum PendingActionResolution {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
