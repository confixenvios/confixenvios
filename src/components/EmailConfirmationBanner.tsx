// Email confirmation is handled by the NestJS API during registration.
// This banner is no longer needed with the new auth flow.

const EmailConfirmationBanner = () => {
  // With NestJS API auth, email confirmation is not required
  return null;
};

export default EmailConfirmationBanner;
