import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1565c0" }}>
        <svg width="132" height="132" viewBox="0 0 48 48">
          <rect x="10" y="6" width="6.5" height="36" rx="3.25" fill="#fff" />
          <circle cx="27" cy="30" r="10.2" fill="none" stroke="#fff" strokeWidth="6.5" />
          <path d="M29.12 20.02 A10.2 10.2 0 0 1 36.46 26.18" fill="none" stroke="#29b6f6" strokeWidth="6.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
