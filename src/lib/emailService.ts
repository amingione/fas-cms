import { Resend } from 'resend';
import { sanityClient } from './sanity';

const resendApiKey = import.meta.env.RESEND_API_KEY as string | undefined;
const resendFrom =
  (import.meta.env.RESEND_FROM as string | undefined) ||
  (typeof process !== 'undefined' ? process.env.RESEND_FROM : undefined) ||
  'FAS Motorsports <noreply@updates.fasmotorsports.com>';
const siteUrl =
  (import.meta.env.PUBLIC_SITE_URL as string | undefined) || 'https://www.fasmotorsports.com';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function triggerOnboardingCampaign(vendorId: string, setupToken: string) {
  const campaign = await sanityClient.fetch(
    `*[_type == "emailCampaign" && campaignType == "vendor_onboarding" && active == true][0]{
      _id,
      emails[emailNumber == 1][0]{ subject, htmlContent }
    }`
  );

  if (!campaign?.emails) {
    console.error('Vendor onboarding campaign not found');
    return { success: false };
  }

  const vendor = await sanityClient.fetch(
    `*[_type == "vendor" && _id == $vendorId][0]{
      companyName,
      portalAccess { email }
    }`,
    { vendorId }
  );

  const setupLink = `${siteUrl}/vendor-portal/setup?token=${setupToken}`;
  const companyName = vendor?.companyName || 'Vendor';
  const toEmail = vendor?.portalAccess?.email;

  let htmlContent = campaign.emails.htmlContent || '';
  htmlContent = htmlContent.replace(/\{\{companyName\}\}/g, companyName);
  htmlContent = htmlContent.replace(/\{\{setupLink\}\}/g, setupLink);

  if (!resend) {
    console.error('Resend not configured');
    return { success: false, error: 'Missing RESEND_API_KEY' };
  }

  if (!toEmail) {
    console.error('Vendor email missing');
    return { success: false, error: 'Vendor email missing' };
  }

  try {
    const result = await resend.emails.send({
      from: resendFrom,
      to: toEmail,
      subject: campaign.emails.subject || 'Welcome to FAS Motorsports',
      html: htmlContent
    });

    await sanityClient.create({
      _type: 'vendorEmailLog',
      vendor: { _type: 'reference', _ref: vendorId },
      campaign: { _type: 'reference', _ref: campaign._id },
      emailNumber: 1,
      subject: campaign.emails.subject || 'Welcome to FAS Motorsports',
      sentAt: new Date().toISOString(),
      status: 'sent',
      resendId: (result as any)?.id
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending onboarding email:', error);
    return { success: false, error };
  }
}
