/** Existing public entry point; implementation is shared with the isolated Edge worker. */
import { generateMail, type RecordData } from "../../supabase/functions/_shared/jaspic/mail";
export type ShigaRecord = Record<string, string | null | undefined>;
export const SHIGA_SUBJECT = " [JASPIC-NES] 滋賀県警専用ツール";
export const SHIGA_FROM = "hppmap@kishibojim.online";
export const SHIGA_TO = "getter01@jaspic-nes.net";
export const SHIGA_CC = "kishibojim@gmail.com";
const normalize = (data: ShigaRecord): RecordData => Object.fromEntries(Object.entries(data).map(([key,value]) => [key,value ?? null]));
export function renderShigaText(current: ShigaRecord, previous: ShigaRecord | null, cityName: string): string {
  return generateMail("shiga-person", normalize(current), previous === null ? null : normalize(previous), {cityName,stationName:""}).body;
}
