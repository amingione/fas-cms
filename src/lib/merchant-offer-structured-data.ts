export type MerchantListingOfferEnhancements = {
  shippingDetails: {
    '@type': 'OfferShippingDetails';
    shippingDestination: {
      '@type': 'DefinedRegion';
      addressCountry: string;
    };
    shippingRate: {
      '@type': 'MonetaryAmount';
      value: number;
      currency: string;
    };
  };
  hasMerchantReturnPolicy: {
    '@type': 'MerchantReturnPolicy';
    applicableCountry: string;
    returnPolicyCategory: string;
    merchantReturnDays: number;
    returnMethod: string;
    returnFees: string;
  };
};

export const DEFAULT_MERCHANT_LISTING_OFFER_ENHANCEMENTS: MerchantListingOfferEnhancements = {
  shippingDetails: {
    '@type': 'OfferShippingDetails',
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'US'
    },
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: 0,
      currency: 'USD'
    }
  },
  hasMerchantReturnPolicy: {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'US',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 30,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn'
  }
};
