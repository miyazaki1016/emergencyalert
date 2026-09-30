import { describe, expect, it } from "vitest";
import { parentAddress } from "./national-lowzoom-max-rank-proof";

describe("low zoom parent mapping", () => {
  it("maps z8 world pixels to their exact z4 parent pixel", () => {
    expect(parentAddress(208,80,0,0)).toEqual({tileX:13,tileY:5,pixelX:0,pixelY:0});
    expect(parentAddress(223,95,255,255)).toEqual({tileX:13,tileY:5,pixelX:255,pixelY:255});
    expect(parentAddress(224,96,0,0)).toEqual({tileX:14,tileY:6,pixelX:0,pixelY:0});
  });
});
