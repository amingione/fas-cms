import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { sanity } from '../../server/sanity-client';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      email,
      contactPerson,
      contactName,
      phone,
      businessAddress,
      resaleCertificateId,
      taxId,
      businessType,
      website,
      message,
      businessName
    } = body;

    const primaryContact = contactPerson || contactName;

    if (!email || !primaryContact || !phone || !businessAddress || !resaleCertificateId || !taxId) {
      return new Response(JSON.stringify({ message: 'Missing required fields.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const existingVendor = await sanity.fetch(
      '*[_type == "vendor" && email == $email][0]',
      { email }
    );
    if (existingVendor) {
      return new Response(JSON.stringify({ message: 'A vendor with this email already exists.' }), {
        status: 409,
        headers: { 'content-type': 'application/json' }
      });
    }

    const passwordHash = await bcrypt.hash('temp123', 10);
    const doc = await sanity.create({
      _type: 'vendor',
      name: primaryContact,
      email,
      passwordHash,
      phone,
      address: businessAddress,
      notes: message,
      status: 'Pending',
      companyName: businessName || '',
      website,
      appliedAt: new Date().toISOString(),
      contactPerson: primaryContact,
      resaleCertificateId,
      taxId,
      businessType,
      yearsInBusiness: 0,
      approved: false,
      active: true
    });

    return new Response(JSON.stringify({ message: 'Application received', vendor: doc }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    console.error('Vendor application failed:', err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
