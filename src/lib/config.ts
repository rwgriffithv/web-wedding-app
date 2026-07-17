function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[config] ${name} is required but not set. ` +
      `Set ${name} in your environment or .env file.`,
    );
  }
  return value;
}

function requireEnvMinLength(name: string, minLength: number): string {
  const value = requireEnv(name);
  if (value.length < minLength) {
    throw new Error(
      `[config] ${name} must be at least ${minLength} characters ` +
      `(got ${value.length}). Set a stronger value in your environment or .env file.`,
    );
  }
  return value;
}

let _config: {
  siteName: string;
  adminUsername: string;
  adminPassword: string;
  sessionSecret: string;
} | null = null;

export function getEnvConfig() {
  if (!_config) {
    _config = {
      siteName: process.env.APP_NAME || "Wedding",
      adminUsername: requireEnv("ADMIN_USERNAME"),
      adminPassword: requireEnv("ADMIN_PASSWORD"),
      sessionSecret: requireEnvMinLength("SESSION_SECRET", 32),
    };
  }
  return _config;
}
