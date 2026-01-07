export async function triggerOnboardingCampaign(vendorId: string, setupToken: string) {
  void vendorId;
  void setupToken;
  console.warn('[vendor onboarding] email sending handled by fas-sanity');
  return { success: false, error: 'Vendor email handled by fas-sanity' };
}
