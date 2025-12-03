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
