import { ImageResponse } from "next/og";

export const alt = "Growvisi — AI Revenue Engine for WhatsApp Sales Teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          background: "linear-gradient(135deg, #f5f3ff 0%, #ffffff 50%, #ecfdf5 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            G
          </div>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#1e1b4b" }}>Growvisi</span>
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, color: "#1e1b4b", lineHeight: 1.15, maxWidth: 900 }}>
          Turn WhatsApp Conversations Into Revenue
        </div>
        <div style={{ fontSize: 24, color: "#4b5563", marginTop: 24, maxWidth: 820, lineHeight: 1.4 }}>
          AI intent scoring, pipeline automation, and revenue analytics for WhatsApp sales teams.
        </div>
        <div style={{ fontSize: 22, color: "#7c3aed", marginTop: 40, fontWeight: 600 }}>
          growvisi.in
        </div>
      </div>
    ),
    { ...size },
  );
}
