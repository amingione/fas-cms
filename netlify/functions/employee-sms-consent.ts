import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { createClient } from '@sanity/client';

const resend = new Resend(process.env.RESEND_API_KEY);

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'r4og35qd',
  dataset: process.env.SANITY_DATASET || 'production',
  token:
    process.env.SANITY_AUTH_TOKEN ||
    process.env.SANITY_WRITE_TOKEN ||
    process.env.SANITY_API_TOKEN ||
    process.env.SANITY_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { full_name, mobile_number, email, sms_consent_acknowledged } = data;

    if (!sms_consent_acknowledged) {
      return {
        statusCode: 400,
        body: 'SMS consent not acknowledged'
      };
    }

    const ipAddress =
      event.headers['x-forwarded-for'] ||
      event.headers['x-real-ip'] ||
      'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0] || full_name;
    const lastName = nameParts.slice(1).join(' ') || '';

    const submission = await sanityClient.create({
      _type: 'empFormSubmission',
      formId: 'sms-consent-form',
      formTitle: 'Employee SMS Consent Form',
      submittedAt: new Date().toISOString(),
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: 'pending',
      formData: {
        firstName: firstName,
        lastName: lastName,
        phoneNumber: mobile_number,
        email: email,
        smsConsent: sms_consent_acknowledged === true,
        consentText:
          'I consent to receive SMS messages from F.A.S. Motorsports for internal operational notifications, including new orders, vendor or customer messages, appointment requests, and system alerts. Message frequency varies. Messages are not marketing or promotional. I may opt out at any time by replying STOP. For help, reply HELP or contact support@fasmotorsports.com.'
      }
    });

    if (email) {
      try {
        const employee = await sanityClient.fetch(
          `*[_type == "empProfile" && workEmail == $email][0]`,
          { email }
        );

        if (employee && sms_consent_acknowledged) {
          await sanityClient
            .patch(employee._id)
            .set({
              smsOptIn: true,
              phone: mobile_number
            })
            .commit();
        }
      } catch (err) {
        console.warn('Could not update employee profile:', err);
      }
    }

    await resend.emails.send({
      from: 'FAS Motorsports <no-reply@updates.fasmotorsports.com>',
      to: ['support@fasmotorsports.com'],
      subject: 'Employee SMS Consent Submitted',
      html: `
        <h2>Employee SMS Consent Received</h2>
        <p><strong>Name:</strong> ${full_name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mobile Number:</strong> ${mobile_number}</p>
        <p><strong>Consent:</strong> Acknowledged</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Sanity Record ID:</strong> ${submission._id}</p>
        <hr />
        <p>
          The employee has consented to receive internal operational SMS notifications
          including orders, vendor/customer messages, appointments, and system alerts.
        </p>
        <p>
          <a href="https://fas-cms.sanity.studio/structure/employee;empFormSubmission;${submission._id}">
            View submission in Sanity Studio
          </a>
        </p>
      `
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        submissionId: submission._id
      })
    };
  } catch (error) {
    console.error('SMS consent submission error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to record consent'
      })
    };
  }
};
