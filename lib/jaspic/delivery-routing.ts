/** New Supabase-based JASPIC delivery routing only.
 * Both prefectures are sent from the authorized Gmail account.
 * Do not CC the sending account itself: Gmail Sent retains the record.
 * The retired Windows sender is unchanged. Importing does not activate dispatch.
 */
export const JASPIC_DELIVERY_ROUTING = {
  hiroshima: { to: "getter01@jaspic-nes.net", cc: null },
  shiga: { to: "getter01@jaspic-nes.net", cc: null },
} as const;

export type JaspicDeliveryPrefecture = keyof typeof JASPIC_DELIVERY_ROUTING;
