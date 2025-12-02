import crypto from 'crypto';
import { sanity, hasWriteToken } from './sanity-client';

const toCleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const buildAddress = (body: Record<string, any>): string => {
  const merged =
    toCleanString(body.businessAddress) ||
    [toCleanString(body.street), toCleanString(body.city), toCleanString(body.state), toCleanString(body.zip)]
      .filter(Boolean)
      .join(', ');
  return merged;
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
  const businessAddress = buildAddress(body);

  if (!email || !contactName || !phone || !companyName || !businessAddress) {
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
      address: businessAddress,
      businessType,
      website,
      resaleCertificateId: resaleCertificateId || undefined,
      taxId: taxId || undefined,
      taxExempt,
      yearsInBusiness,
      estimatedMonthlyVolume: estimatedMonthlyVolume || undefined,
      productsInterested: productsInterested || undefined,
      currentSuppliers: currentSuppliers || undefined,
      referralSource: referralSource || undefined,
      additionalInfo: additionalInfo || undefined,
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
