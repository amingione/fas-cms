import { Resend } from 'resend';
import { sanityClient } from './sanity';

const resend = new Resend(process.env.RESEND_API_KEY as string | undefined);
const resendFrom =
  process.env.RESEND_FROM || 'FAS Motorsports <noreply@updates.fasmotorsports.com>';

export async function notifyVendorsOfNewPost(postId: string) {
  if (!resend) return;
  const post = await sanityClient.fetch(
    `*[_type == "vendorPost" && _id == $postId][0]{
      title,
      excerpt,
      slug,
      postType
    }`,
    { postId }
  );

  if (!post) return;

  const vendors = await sanityClient.fetch(
    `*[_type == "vendor" 
      && portalAccess.enabled == true 
      && portalAccess.notificationPreferences.emailUpdates == true
    ]{
      companyName,
      portalAccess { email }
    }`
  );

  const postUrl = `${process.env.PUBLIC_SITE_URL}/vendor-portal/blog/${post.slug.current}`;

  for (const vendor of vendors) {
    if (!vendor?.portalAccess?.email) continue;
    await resend.emails.send({
      from: resendFrom,
      to: vendor.portalAccess.email,
      subject: `New Update: ${post.title}`,
      html: `
        <h1>${post.title}</h1>
        <p>${post.excerpt || ''}</p>
        <a href="${postUrl}">Read More</a>
      `
    });
  }
}
