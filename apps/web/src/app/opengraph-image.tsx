import { GROWVISI_WEB_URL } from "@growvisi/shared";
import { ImageResponse } from "next/og";

export const alt = "Growvisi — AI Revenue Engine for WhatsApp Sales Teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const markUrl = `${GROWVISI_WEB_URL}/brand/growvisi-mark.png`;

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
          background: "linear-gradient(135deg, #f8f9ff 0%, #ffffff 50%, #ecfdf5 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markUrl} width={64} height={64} alt="" />
          <span style={{ fontSize: 36, fontWeight: 700, color: "#0b1c30" }}>Growvisi</span>
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, color: "#0b1c30", lineHeight: 1.15, maxWidth: 900 }}>
          Turn WhatsApp conversations into revenue
        </div>
        <div style={{ fontSize: 24, color: "#45464d", marginTop: 24, maxWidth: 820, lineHeight: 1.4 }}>
          AI intent scoring, pipeline automation, and revenue analytics for WhatsApp sales teams.
        </div>
        <div style={{ fontSize: 22, color: "#006c49", marginTop: 40, fontWeight: 600 }}>
          growvisi.in
        </div>
      </div>
    ),
    { ...size },
  );
}
