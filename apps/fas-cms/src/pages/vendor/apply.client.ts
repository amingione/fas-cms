function renderForm(): void {
  const container = document.getElementById('applicationContainer');
  if (!container) return;
  container.innerHTML = `
    <div>
      <h1 class="relative text-2xl mt-10 text-white font-bold">
        <span class="text-red-600">F.a.S.</span> Motorsports
      </h1>
      <h2 class="text-2xl font-bold mt-2 text-red-600">Vendor Application</h2>
      <form id="vendorApplicationForm" class="space-y-4 bg-black/30 p-6 border border-white mt-6 max-w-xl mx-auto rounded-lg">
        <input type="text" name="businessName" placeholder="Company Name" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" required />
        <input type="text" name="contactName" placeholder="Main Contact Person" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" required />
        <input type="email" name="email" placeholder="Email" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" required />
        <input type="tel" name="phone" placeholder="Phone Number" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" required />
        <input type="text" name="businessType" placeholder="Business Type" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" />
        <input type="text" name="resaleCertificateId" placeholder="Resale Certificate ID" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" required />
        <input type="text" name="taxId" placeholder="Tax ID (EIN)" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" required />
        <input type="text" name="businessAddress" placeholder="Business Address" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" required />
        <textarea name="message" placeholder="Additional Information" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white" rows="4"></textarea>
        <button type="submit" class="w-full bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition duration-200 font-bold disabled:opacity-50">
          Submit Application
        </button>
        <p id="applicationStatus" class="text-center mt-4"></p>
      </form>
    </div>
  `;
  const form = document.getElementById('vendorApplicationForm') as HTMLFormElement | null;
  if (form) form.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const statusEl = document.getElementById('applicationStatus') as HTMLElement | null;
  if (statusEl) statusEl.textContent = '';

  const formData = new FormData(form);
  const businessName = String(formData.get('businessName') || '').trim();
  const contactName = String(formData.get('contactName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const resaleCertificateId = String(formData.get('resaleCertificateId') || '').trim();
  const taxId = String(formData.get('taxId') || '').trim();
  const businessAddress = String(formData.get('businessAddress') || '').trim();
  const message = String(formData.get('message') || '').trim();
  const businessType = String(formData.get('businessType') || '').trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9\-\+]{9,15}$/;
  if (!businessName || !contactName || !email || !phone || !resaleCertificateId || !taxId || !businessAddress) {
    if (statusEl) statusEl.textContent = '❌ Please fill out all required fields.';
    return;
  }
  if (!emailRegex.test(email)) {
    if (statusEl) statusEl.textContent = '❌ Please enter a valid email address.';
    return;
  }
  if (!phoneRegex.test(phone)) {
    if (statusEl) statusEl.textContent = '❌ Please enter a valid phone number.';
    return;
  }

  try {
    const res = await fetch('/api/vendor-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName,
        contactName,
        email,
        phone,
        resaleCertificateId,
        taxId,
        businessAddress,
        message,
        businessType
      })
    });
    if (res.ok) {
      renderSuccess();
    } else if (res.status === 409) {
      if (statusEl) statusEl.textContent = '❌ A vendor with this email already applied.';
    } else {
      const text = await res.text();
      if (statusEl) statusEl.textContent = `❌ Something went wrong: ${res.statusText || text}`;
    }
  } catch {
    if (statusEl) statusEl.textContent = '❌ Network error — please check your connection and try again.';
  }
}

function renderSuccess(): void {
  const container = document.getElementById('applicationContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="text-center max-w-xl mx-auto space-y-4">
      <h1 class="text-3xl font-bold text-red-600">Application Received</h1>
      <p class="text-lg">Thank you for your interest in becoming a vendor with FAS Motorsports.</p>
      <p class="text-md text-gray-300">Our sales team will review your application and reach out within 48 hours.</p>
    </div>
  `;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderForm);
} else {
  renderForm();
}

