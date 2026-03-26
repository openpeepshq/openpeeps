export const truncateText = (text?: string | null, maxLength: number = 15) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const randomString = (
  length: number,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
) => {
  let result = '';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

export const capitalizeFirstLetter = (string: string) =>
  string.charAt(0).toUpperCase() + string.slice(1);
