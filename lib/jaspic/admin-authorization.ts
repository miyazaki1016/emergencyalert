/** Fail-closed JASPIC authorization. Never trust user_metadata or an email alone. */
export function isJaspicAdmin(user: {
  id?: string;
  app_metadata?: Record<string, unknown>;
} | null | undefined, configuredAdminId: string | undefined): boolean {
  if (!user || !configuredAdminId || !/^[0-9a-f-]{36}$/i.test(configuredAdminId)) return false;
  return user.id === configuredAdminId && user.app_metadata?.jaspic_role === "admin";
}
