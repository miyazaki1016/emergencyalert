/**
 * Issue #238: fail-closed configuration gate for the isolated JASPIC Gmail test.
 * This is deliberately NOT wired to the production dispatch route.
 * No email or database writes happen in this module.
 */
export const JASPIC_TEST_RECIPIENT = "kishibojim@gmail.com" as const;
export const JASPIC_PRODUCTION_RECIPIENT = "getter01@jaspic-nes.net" as const;

export type IsolatedSendConfig = {
  testDatabaseUrl?: string;
  testDatabaseKey?: string;
  productionDatabaseUrl?: string;
  productionDatabaseKey?: string;
  recipient?: string;
  productionRuntime?: boolean;
  explicitTestEnable?: boolean;
};

function normalizedUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("ISOLATED_DB_HTTPS_REQUIRED");
  if (parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new Error("ISOLATED_DB_URL_INVALID");
  return parsed.origin.toLowerCase();
}

/**
 * Fail closed if the test could use the production database or recipient.
 * Production OAuth may be reused by the caller, but only after this gate and
 * the separate, least-privilege test DB connection have been established.
 */
export function assertIsolatedSendConfig(config: IsolatedSendConfig): {
  databaseUrl: string;
  databaseKey: string;
  recipient: typeof JASPIC_TEST_RECIPIENT;
} {
  if (!config.explicitTestEnable || !config.productionRuntime)
    throw new Error("ISOLATED_SEND_DISABLED");
  if (config.recipient !== JASPIC_TEST_RECIPIENT)
    throw new Error("ISOLATED_RECIPIENT_REJECTED");
  if (!config.testDatabaseUrl || !config.productionDatabaseUrl ||
      !config.testDatabaseKey || !config.productionDatabaseKey)
    throw new Error("ISOLATED_DB_CONFIG_MISSING");
  const testUrl = normalizedUrl(config.testDatabaseUrl);
  const productionUrl = normalizedUrl(config.productionDatabaseUrl);
  if (testUrl === productionUrl || config.testDatabaseKey === config.productionDatabaseKey)
    throw new Error("ISOLATED_DB_NOT_DISTINCT");
  if (!testUrl.endsWith(".supabase.co"))
    throw new Error("ISOLATED_DB_HOST_REJECTED");
  return {databaseUrl: testUrl, databaseKey: config.testDatabaseKey, recipient: JASPIC_TEST_RECIPIENT};
}
