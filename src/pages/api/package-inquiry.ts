import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    // Extract form fields
    const name = formData.get('name')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const phone = formData.get('phone')?.toString().trim() || '';
    const packageName = formData.get('package')?.toString().trim() || '';
    const vehicleYear = formData.get('vehicleYear')?.toString().trim() || '';
    const vehicleMake = formData.get('vehicleMake')?.toString().trim() || '';
    const vehicleModel = formData.get('vehicleModel')?.toString().trim() || '';
    const currentSetup = formData.get('currentSetup')?.toString().trim() || 'Not provided';
    const goals = formData.get('goals')?.toString().trim() || '';
    const contactMethod = formData.get('contactMethod')?.toString().trim() || 'Either';
    const bestTime = formData.get('bestTime')?.toString().trim() || 'Not specified';

    // Validate required fields
    if (!name || !email || !phone || !packageName || !vehicleYear || !vehicleMake || !vehicleModel || !goals) {
      return new Response(
        JSON.stringify({ message: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ message: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build email body
    const emailBody = `
FAS Motorsports - ${packageName} Consultation Request

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:    ${name}
Email:   ${email}
Phone:   ${phone}

Preferred Contact Method: ${contactMethod}
Best Time to Call:        ${bestTime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VEHICLE INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vehicle: ${vehicleYear} ${vehicleMake} ${vehicleModel}

Current Setup/Mods:
${currentSetup}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POWER GOALS & QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${goals}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACKAGE REQUESTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${packageName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
From: fasmotorsports.com/packages
    `.trim();

    // Send email using Resend (if configured) or fallback to console log
    const resendApiKey = import.meta.env.RESEND_API_KEY;

    if (resendApiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'FAS Motorsports <fas@fasmotorsports.com>',
          to: ['sales@fasmotorsports.com'],
          reply_to: email,
          subject: `${packageName} Consultation Request - ${name}`,
          text: emailBody
        })
      });

      if (!resendRes.ok) {
        console.error('Resend API error:', await resendRes.text());
        return new Response(
          JSON.stringify({ message: 'Failed to send email. Please try again or contact us directly.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Fallback: Log to console (development mode)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PACKAGE INQUIRY (Email not configured)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(emailBody);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return new Response(
      JSON.stringify({
        message: 'Your consultation request has been submitted successfully! Our team will reach out within 24 hours.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Package inquiry error:', error);
    return new Response(
      JSON.stringify({ message: 'An error occurred while processing your request.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
