import customer from './schemas/customer';
import marketingOptIn from './schemas/marketingOptIn';
import quoteRequest from './schemas/quoteRequest';
import vendor from './schemas/vendor';
import vendorAuthToken from './schemas/vendorAuthToken';
import emailCampaign from './schemas/emailCampaign';
import vendorMessage from './schemas/vendorMessage';
import vendorNotification from './schemas/vendorNotification';

// Export Sanity schema types from the local schemas directory.
export const schemaTypes = [
  customer,
  quoteRequest,
  marketingOptIn,
  vendor,
  vendorAuthToken,
  emailCampaign,
  vendorMessage,
  vendorNotification
];
