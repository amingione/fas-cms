import { Resend } from 'resend';
import { sanity } from '@/server/sanity-client';
import { RESEND_API_KEY, RESEND_FROM } from './config';

type ReplacementMap = Record<string, string | number | undefined | null>;

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

type EmailCampaign = {
  _id: string;
  slug: string;
  subject?: string;
  from?: string;
  previewText?: string;
  body?: Array<any>;
};

function fallbackTemplate(slug: string, replacements: ReplacementMap) {
  if (slug === 'vendor-portal-invitation') {
    return {
      subject: 'Set up your FAS Motorsports vendor portal account',
      body: `
        <p>Welcome to the FAS Motorsports Vendor Portal.</p>
        <p>Click below to set your password and activate access.</p>
        <p><a href="${replacements.invitationLink || '#'}">Set up your account</a></p>
        <p>This link expires soon.</p>
      `
    };
  }
  if (slug === 'vendor-password-reset') {
    return {
      subject: 'Reset your FAS Motorsports vendor portal password',
      body: `
        <p>We received a request to reset your password.</p>
        <p><a href="${replacements.resetLink || '#'}">Reset your password</a></p>
        <p>This link expires in one hour.</p>
      `
    };
  }
  return {
    subject: 'FAS Motorsports Vendor Portal',
    body: `<p>${replacements.message || 'This is a vendor portal notification.'}</p>`
  };
}

function simplePortableTextToHtml(blocks?: Array<any>): string {
  if (!Array.isArray(blocks)) return '';
  const parts: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (block._type === 'block' && Array.isArray(block.children)) {
      const text = block.children.map((c: any) => c.text || '').join('');
      const tag = block.style === 'h2' || block.style === 'h3' ? block.style : 'p';
      parts.push(`<${tag}>${text}</${tag}>`);
    } else if (block._type === 'image' && block.asset?._ref) {
      parts.push(`<p><img src="${block.asset._ref}" alt="" /></p>`);
    }
  }
  return parts.join('\n');
}

function applyReplacements(html: string, replacements: ReplacementMap) {
  let output = html;
  for (const [key, value] of Object.entries(replacements)) {
    const safeValue = value ?? '';
    const token = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    output = output.replace(token, String(safeValue));
  }
  return output;
}

export async function loadEmailCampaign(slug: string): Promise<EmailCampaign | null> {
  try {
    const query =
      '*[_type == "emailCampaign" && slug.current == $slug][0]{_id, "slug": slug.current, subject, from, previewText, body}';
    return await sanity.fetch(query, { slug });
  } catch (err) {
    console.warn('[vendor-email] failed to load template', err);
    return null;
  }
}

export async function renderEmail(slug: string, replacements: ReplacementMap) {
  const template = await loadEmailCampaign(slug);
  const fallback = fallbackTemplate(slug, replacements);
  const htmlSource = template?.body ? simplePortableTextToHtml(template.body) : fallback.body;
  const html = applyReplacements(htmlSource, replacements);
  const subject = applyReplacements(template?.subject || fallback.subject, replacements);
  const from = template?.from || RESEND_FROM;
  const previewText = template?.previewText
    ? applyReplacements(template.previewText, replacements)
    : undefined;
  return { html, subject, from, previewText };
}

export async function sendVendorEmail(to: string, slug: string, replacements: ReplacementMap) {
  const rendered = await renderEmail(slug, replacements);
  if (!resendClient) {
    throw new Error('Resend is not configured (RESEND_API_KEY missing)');
  }
  await resendClient.emails.send({
    from: rendered.from,
    to,
    subject: rendered.subject,
    html: rendered.html,
    ...(rendered.previewText ? { headers: { 'X-Entity-Ref-ID': rendered.previewText } } : {})
  });
}
