import { openGmailWebSessionOffline } from "./oauth-session-offline";
import { consumeOAuthStateOffline, type OAuthOnceStore } from "./oauth-once-offline";
import { validateJaspicOAuthCallback } from "./oauth-callback-validation";
import { prepareJaspicIdentityCodeExchange } from "./oauth-identity-exchange";

/**
 * Server-only callback preparation. Validates a sealed owner-bound session,
 * consumes durable state atomically, then prepares a code exchange.
 * Does not execute HTTP, store tokens, grant Gmail scopes, or send mail.
 */
export async function prepareJaspicIdentityCallback(input: {
  callbackUrl: string;
  sealedCookie: string;
  cookieEncryptionKey: string;
  adminUserId: string | undefined;
  stateStore: OAuthOnceStore;
  clientId: string;
  clientSecret: string;
  now?: number;
  purpose?: "gmail-send";
}) {
  const url = new URL(input.callbackUrl);
  if (url.searchParams.getAll("state").length !== 1) throw new Error("Invalid callback state");
  const state = url.searchParams.get("state") ?? "";
  const session = await openGmailWebSessionOffline(
    input.sealedCookie, state, input.cookieEncryptionKey, input.now,
  );
  if (!input.adminUserId || session.ownerId !== input.adminUserId || session.purpose !== input.purpose) {
    throw new Error("Unauthorized callback owner");
  }
  const { code } = validateJaspicOAuthCallback(input.callbackUrl, state);
  if (!await consumeOAuthStateOffline(input.stateStore, state, session.ownerId, input.now)) {
    throw new Error("OAuth state already used or expired");
  }
  return prepareJaspicIdentityCodeExchange({
    clientId: input.clientId, clientSecret: input.clientSecret,
    code, codeVerifier: session.codeVerifier,
  });
}
