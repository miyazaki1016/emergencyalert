import { JASPIC_GOOGLE_CALLBACK } from "./oauth-consent-preparation";

/** Offline request preparation only. Never execute from a client component. */
export function prepareJaspicIdentityCodeExchange(input: {
  clientId: string; clientSecret: string; code: string; codeVerifier: string;
}): { url: string; method: "POST"; headers: { "Content-Type": string }; body: string } {
  if (!/^[A-Za-z0-9_.-]+\.apps\.googleusercontent\.com$/.test(input.clientId) ||
      !input.clientSecret || input.clientSecret.length > 8192 || /[\r\n\0]/.test(input.clientSecret) ||
      !/^[A-Za-z0-9_\/.~-]{1,4096}$/.test(input.code) ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(input.codeVerifier)) {
    throw new Error("Invalid OAuth exchange input");
  }
  return {
    url: "https://oauth2.googleapis.com/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId, client_secret: input.clientSecret,
      code: input.code, code_verifier: input.codeVerifier,
      redirect_uri: JASPIC_GOOGLE_CALLBACK, grant_type: "authorization_code",
    }).toString(),
  };
}
