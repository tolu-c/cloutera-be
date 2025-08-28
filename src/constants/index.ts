const required = (value?: string): string => {
  if (value === null || value === undefined) {
    throw new Error("Required configuration value is missing");
  }
  return value;
};

export const API_URL = "https://peakerr.com/api/v2";
export const getPeakerApiKey = (): string =>
  required(process.env.PEAKER_API_KEY);

export const SALT_ROUNDS = 8;
