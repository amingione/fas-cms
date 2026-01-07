import crypto from 'crypto';
import { sanity, hasWriteToken } from './sanity-client';

const toCleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export type VendorApplicationResult = {
  status: number;
  body: Record<string, any>;
};

export async function handleVendorApplication(body: Record<string, any>): Promise<VendorApplicationResult> {
  if (!hasWriteToken) {
    return {
      status: 500,
      body: { message: 'Sanity write token missing. Set SANITY_WRITE_TOKEN (or SANITY_API_TOKEN) to accept applications.' }
    };
  }

  const email = toCleanString(body.contactEmail || body.email);
  const contactName = toCleanString(body.contactName || body.contactPerson);
  const contactTitle = toCleanString(body.contactTitle);
  const phone = toCleanString(body.contactPhone || body.phone);
  const companyName = toCleanString(body.companyName || body.businessName);
  const businessType = toCleanString(body.businessType);
  const website = toCleanString(body.website);
  const resaleCertificateId = toCleanString(body.resaleCertificateId);
  const taxId = toCleanString(body.taxId);
  const yearsInBusiness = toNumber(body.yearsInBusiness);
  const estimatedMonthlyVolume = toCleanString(body.estimatedMonthlyVolume);
  const productsInterested = toCleanString(body.productsInterested);
  const currentSuppliers = toCleanString(body.currentSuppliers);
  const additionalInfo = toCleanString(body.additionalInfo || body.message);
  const referralSource = toCleanString(body.referralSource);
  const taxExempt =
    body.taxExempt === true ||
    toCleanString(body.taxExempt).toLowerCase() === 'true' ||
    toCleanString(body.taxExempt).toLowerCase() === 'on';
  const street = toCleanString(body.street);
  const city = toCleanString(body.city);
  const state = toCleanString(body.state);
  const zip = toCleanString(body.zip);
  const businessAddressStr =
    toCleanString(body.businessAddress) ||
    [street, city, state, zip].filter(Boolean).join(', ');
  const productsInterestedList = Array.isArray(body.productsInterested)
    ? body.productsInterested.map(toCleanString).filter(Boolean)
    : productsInterested
      ? productsInterested.split(',').map((item) => item.trim()).filter(Boolean)
      : undefined;

  if (!email || !contactName || !phone || !companyName || !businessAddressStr) {
    return { status: 400, body: { message: 'Missing required fields.' } };
  }

  try {
    const [existingVendor, existingApplication] = await Promise.all([
      sanity.fetch('*[_type == "vendor" && email == $email][0]', { email }),
      sanity.fetch('*[_type == "vendorApplication" && email == $email][0]', { email })
    ]);

    if (existingVendor || existingApplication) {
      return {
        status: 409,
        body: { message: 'A vendor or application with this email already exists.' }
      };
    }

    const applicationNumber = `APP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const doc = await sanity.create({
      _type: 'vendorApplication',
      companyName,
      contactName,
      contactTitle,
      email,
      phone,
      businessAddress: {
        street: street || businessAddressStr || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
        country: toCleanString(body.country) || 'US'
      },
      businessType,
      website,
      taxId: taxId || resaleCertificateId || undefined,
      taxExempt,
      yearsInBusiness,
      estimatedMonthlyVolume: estimatedMonthlyVolume || undefined,
      productsInterested: productsInterestedList || undefined,
      currentSuppliers: currentSuppliers || undefined,
      howDidYouHear: referralSource || undefined,
      additionalNotes: additionalInfo || undefined,
      status: 'pending',
      applicationNumber,
      submittedAt: new Date().toISOString()
    });

    return {
      status: 200,
      body: { message: 'Application received', application: doc, applicationNumber }
    };
  } catch (err: any) {
    const safeMessage =
      typeof err?.message === 'string' && err.message
        ? err.message
        : 'Internal server error';
    return {
      status: 500,
      body: { message: safeMessage }
    };
  }
}
