import crypto from 'crypto';
import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { sanity } from '../../server/sanity-client';

const toCleanString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Support both legacy and new form field names
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

    const businessAddress =
      toCleanString(body.businessAddress) ||
      [toCleanString(body.street), toCleanString(body.city), toCleanString(body.state), toCleanString(body.zip)]
        .filter(Boolean)
        .join(', ');

    if (!email || !contactName || !phone || !companyName || !businessAddress) {
      return new Response(JSON.stringify({ message: 'Missing required fields.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const existingVendor = await sanity.fetch('*[_type == "vendor" && email == $email][0]', { email });
    if (existingVendor) {
      return new Response(JSON.stringify({ message: 'A vendor with this email already exists.' }), {
        status: 409,
        headers: { 'content-type': 'application/json' }
      });
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

    return new Response(
      JSON.stringify({ message: 'Application received', vendor: doc, applicationNumber }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('Vendor application failed:', err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
