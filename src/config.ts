export interface BVConfig {
  timeout?: number;
  maxRetries?: number;
  apiKeys?: Record<string, string>;
}

export interface ResolvedConfig {
  timeout: number;
  maxRetries: number;
  apiKeys: Record<string, string>;
}

const ENV_KEY_MAP: Record<string, string> = {
  BV_CGU_API_KEY: "cgu",
  BV_GOV_BR_TOKEN: "govbr",
};

const DEFAULTS: ResolvedConfig = {
  timeout: 30000,
  maxRetries: 3,
  apiKeys: {},
};

let userConfig: BVConfig = {};

export function configure(config: BVConfig): void {
  userConfig = { ...userConfig, ...config };
}

export function getConfig(): ResolvedConfig {
  const envKeys: Record<string, string> = {};
  for (const [envVar, sourceName] of Object.entries(ENV_KEY_MAP)) {
    const value = process.env[envVar];
    if (value) {
      envKeys[sourceName] = value;
    }
  }

  return {
    timeout: userConfig.timeout ?? DEFAULTS.timeout,
    maxRetries: userConfig.maxRetries ?? DEFAULTS.maxRetries,
    apiKeys: { ...envKeys, ...userConfig.apiKeys },
  };
}

export function resetConfig(): void {
  userConfig = {};
}
