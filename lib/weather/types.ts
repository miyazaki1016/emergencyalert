export type RainFrameStatus =
  | "RAIN"
  | "NO_RAIN"
  | "NO_DATA"
  | "OUT_OF_COVERAGE"
  | "FETCH_ERROR"
  | "UNKNOWN_PIXEL";

export type RainIntensityClass =
  | "LT_1"
  | "1_TO_5"
  | "5_TO_10"
  | "10_TO_20"
  | "20_TO_30"
  | "30_TO_50"
  | "50_TO_80"
  | "GTE_80";

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface OfficialRainFrame {
  baseTime: string;
  validTime: string;
  status: RainFrameStatus;
  intensityClass: RainIntensityClass | null;
  rgba: Rgba | null;
  source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST";
  debug?: {
    zoom: number;
    tileX: number;
    tileY: number;
    pixelX: number;
    pixelY: number;
  };
}


export type RainSemanticEventType =
  | "RAIN_CLEAR"
  | "RAIN_APPROACHING"
  | "ACTIONABLE_RAIN_APPROACHING"
  | "RAINING"
  | "RAIN_EASING"
  | "RAIN_ENDING";

export type RainSemanticUrgency = "INFO" | "LIFESTYLE_ACTION";
export type RainSuggestedAction = "NONE" | "BRING_LAUNDRY_INSIDE";

export interface RainSemanticEvent {
  schemaVersion: 1;
  eventType: RainSemanticEventType;
  urgency: RainSemanticUrgency;
  suggestedAction: RainSuggestedAction;
  startsAt: string | null;
  actionableAt: string | null;
  endingAt: string | null;
  source: "JMA_HIGH_RESOLUTION_PRECIPITATION_NOWCAST";
  checkedAt: string;
}
