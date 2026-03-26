export const calculatePasswordStrength = (password: string) => {
	let strength = 0;

	// Check for minimum length
	if (password.length >= 8) {
		strength++;

		// Check for uppercase letters
		if (/[A-Z]/.test(password)) {
			strength++;
		}

		// Check for lowercase letters
		if (/[a-z]/.test(password)) {
			strength++;
		}

		// Check for numbers
		if (/\d/.test(password)) {
			strength++;
		}

		// Check for special characters
		if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
			strength++;
		}
	}

	return strength;
};
export const getStrengthMessage = (strength: number) => {
	if (strength < 3) {
		return 'Weak password';
	} else if (strength >= 3 && strength < 5) {
		return 'Moderate password';
	} else if (strength >= 5) {
		return 'Strong password';
	}
};
