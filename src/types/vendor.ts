export interface VendorPortalAccess {
  enabled: boolean;
  email: string;
  passwordHash?: string;
  setupToken?: string;
  setupTokenExpiry?: string;
  setupCompletedAt?: string;
  invitedAt?: string;
  lastLogin?: string;
  permissions?: string[];
}

export interface Vendor {
  _id: string;
  _type: 'vendor';
  name?: string;
  companyName?: string;
  displayName?: string;
  email?: string;
  portalAccess: VendorPortalAccess;
}

export interface VendorMessageSummary {
  _id: string;
  subject?: string;
  status?: string;
  priority?: string;
  category?: string;
  createdAt?: string;
  lastReplyAt?: string;
  lastReply?: string;
  lastReplyIsStaff?: boolean;
  replyCount?: number;
}

export interface VendorMessageReply {
  message?: string;
  author?: string;
  authorEmail?: string;
  timestamp?: string;
  isStaff?: boolean;
}

export interface VendorMessageDetail {
  _id: string;
  subject?: string;
  status?: string;
  priority?: string;
  category?: string;
  replies?: VendorMessageReply[];
}
