export const hexToRgb = (hex: string) => {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // Expand 3-character hex to 6-character
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  // Parse the r, g, b values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
};
