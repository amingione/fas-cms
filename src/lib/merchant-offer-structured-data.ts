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
    deliveryTime: {
      '@type': 'ShippingDeliveryTime';
      handlingTime: {
        '@type': 'QuantitativeValue';
        minValue: number;
        maxValue: number;
        unitCode: string;
      };
      transitTime: {
        '@type': 'QuantitativeValue';
        minValue: number;
        maxValue: number;
        unitCode: string;
      };
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
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 0,
        maxValue: 1,
        unitCode: 'DAY'
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: 3,
        maxValue: 7,
        unitCode: 'DAY'
      }
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
