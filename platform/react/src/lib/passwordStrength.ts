/**
 * Port of `@openpeepshq/svelte/utils/password-strength.ts`. Scores a password
 * from 0 to 5 based on length + character class diversity.
 */
export const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) {
    strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  }
  return strength;
};

export const getStrengthMessage = (strength: number): string => {
  if (strength < 3) return 'Weak password';
  if (strength < 5) return 'Moderate password';
  return 'Strong password';
};
