import { JASPIC_GOOGLE_CALLBACK } from "./oauth-consent-preparation";

/** Pure callback validation: no token exchange, network, storage, or mail. */
export function validateJaspicOAuthCallback(
  callbackUrl: string,
  expectedState: string,
): { code: string } {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(expectedState)) throw new Error("Invalid OAuth state");
  const url = new URL(callbackUrl);
  const expected = new URL(JASPIC_GOOGLE_CALLBACK);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname ||
      url.hash || url.searchParams.has("error") ||
      url.searchParams.getAll("state").length !== 1 ||
      url.searchParams.get("state") !== expectedState ||
      url.searchParams.getAll("code").length !== 1) {
    throw new Error("Invalid OAuth callback");
  }
  const code = url.searchParams.get("code") ?? "";
  if (!/^[A-Za-z0-9_\/.~-]{1,4096}$/.test(code)) throw new Error("Invalid OAuth code");
  return { code };
}
