import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: 112,
        }}
      >
        <div
          style={{
            width: 330,
            height: 330,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "#0b6cff",
            color: "#ffffff",
            fontSize: 210,
            fontWeight: 800,
          }}
        >
          !
        </div>
      </div>
    ),
    size,
  );
}
