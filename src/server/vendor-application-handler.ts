import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
    const existingVendor = await sanity.fetch('*[_type == "vendor" && email == $email][0]', { email });
    if (existingVendor) {
      return {
        status: 409,
        body: { message: 'A vendor with this email already exists.' }
      };
    }

    const applicationNumber = `V-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;

    const tempPassword = crypto.randomBytes(10).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const doc = await sanity.create({
      _type: 'vendor',
      name: contactName,
      contactPerson: contactName,
      contactTitle,
      email,
      phone,
      address: businessAddress,
      companyName,
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
      notes: additionalInfo || undefined,
      applicationNumber,
      passwordHash,
      status: 'Pending',
      approved: false,
      active: true,
      appliedAt: new Date().toISOString()
    });

    return {
      status: 200,
      body: { message: 'Application received', vendor: doc, applicationNumber }
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
