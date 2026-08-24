/**
 * Single source of truth for store listings, privacy contact and in-app credits.
 * Keep aligned with docs/PUBLISHER.md and store-assets/privacy-policy.html.
 */
export const PUBLISHER = {
  legalName: 'SahelPay Technologies',
  developerName: 'Abdoulaye NIANGALY',
  address: 'Bamako, République du Mali',
  country: 'ML',
  website: 'https://sahelpay.ml',
  supportEmail: 'support@sahelpay.ml',
  privacyEmail: 'privacy@sahelpay.ml',
  privacyPolicyUrl: 'https://sahelpay.ml/apps/sos-securite-mali/privacy',
  appName: 'SOS Sécurité Mali',
  androidPackage: 'ml.sossecurite.app',
  iosBundleId: 'ml.sossecurite.app',
  version: '1.0.0',
  price: 'free' as const,
  containsAds: false,
  requiresAccount: false,
} as const;

export const SUPPORT_MAILTO = `mailto:${PUBLISHER.supportEmail}?subject=${encodeURIComponent('SOS Sécurité Mali — support')}`;
export const PRIVACY_MAILTO = `mailto:${PUBLISHER.privacyEmail}?subject=${encodeURIComponent('SOS Sécurité Mali — confidentialité')}`;
