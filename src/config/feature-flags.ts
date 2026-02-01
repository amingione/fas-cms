/**
 * Feature Flags Configuration
 *
 * Use these flags to toggle between new and legacy implementations.
 * Enables safe rollback if issues are discovered in production.
 */

export interface FeatureFlags {
  /**
   * Toggle between new redesigned checkout UI and legacy checkout
   *
   * - `true`: Use new split-screen checkout UI (redesigned)
   * - `false`: Use legacy checkout UI (original)
   *
   * @default false (safe default - use legacy until new is tested)
   */
  useNewCheckoutUI: boolean;

  /**
   * Toggle between new cancelled checkout page and legacy
   *
   * - `true`: Use new enhanced cancelled page
   * - `false`: Use legacy cancelled page
   *
   * @default false
   */
  useNewCancelledUI: boolean;

  /**
   * Toggle between new success page and legacy
   *
   * - `true`: Use new enhanced success page with full order details
   * - `false`: Use legacy success page
   *
   * @default false
   */
  useNewSuccessUI: boolean;
}

/**
 * Feature flag values - change these to toggle features
 *
 * ROLLBACK INSTRUCTIONS:
 * If the new checkout causes issues, simply change the relevant flag to `false`
 * and redeploy. No code changes needed.
 */
export const featureFlags: FeatureFlags = {
  // Set to true once new checkout is tested and ready
  useNewCheckoutUI: import.meta.env.PUBLIC_USE_NEW_CHECKOUT === 'true' || false,

  // Set to true once new cancelled page is tested and ready
  useNewCancelledUI: import.meta.env.PUBLIC_USE_NEW_CANCELLED === 'true' || false,

  // Set to true once new success page is tested and ready
  useNewSuccessUI: import.meta.env.PUBLIC_USE_NEW_SUCCESS === 'true' || false,
};

/**
 * Get a specific feature flag value
 */
export function getFeatureFlag(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}

/**
 * Check if we're using the legacy checkout flow
 */
export function useLegacyCheckout(): boolean {
  return !featureFlags.useNewCheckoutUI;
}

/**
 * Log current feature flag state (for debugging)
 */
export function logFeatureFlags(): void {
  if (import.meta.env.DEV) {
    console.log('[Feature Flags]', featureFlags);
  }
}
