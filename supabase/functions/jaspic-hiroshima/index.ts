import { createHandler, restStore } from "../_shared/jaspic/handler.ts";
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
Deno.serve(createHandler("hiroshima", {
  token: Deno.env.get("JASPIC_HIROSHIMA_JOB_TOKEN") ?? "",
  persistAllowed: Deno.env.get("JASPIC_HIROSHIMA_DRY_RUN_PERSIST") === "true",
  store: restStore(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
}));
