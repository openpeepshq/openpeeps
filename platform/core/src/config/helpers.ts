import dotenv from 'dotenv';
dotenv.config();

export const readEnvInteger = (key: string, defaultValue: number) => {
  const stringValue = process.env[key];
  return stringValue ? Number.parseInt(stringValue) : defaultValue;
};
