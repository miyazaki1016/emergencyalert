/** New Supabase-based JASPIC delivery routing only.
 * The retired Windows sender is intentionally unchanged.
 * These values are NOT activated by importing this module.
 * Keep bulk dispatch and scheduled delivery disabled until separately reviewed.
 */
export const JASPIC_DELIVERY_ROUTING = {
  hiroshima: {
    to: "getter01@jaspic-nes.net",
    cc: "miyazaki1016@me.com",
  },
  shiga: {
    to: "getter01@jaspic-nes.net",
    cc: "miyazaki1016@gmail.com",
  },
} as const;

export type JaspicDeliveryPrefecture = keyof typeof JASPIC_DELIVERY_ROUTING;
