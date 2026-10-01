import { ImageResponse } from "next/og";

export const alt = "BandCraft AI: discover the truth about your IELTS Writing band";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Onest Bold as TTF (the OG renderer can't read woff2). Falls back to the default font if offline. */
async function onestBold(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Onest:wght@700")).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await onestBold();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#ffffff", color: "#0b1f33", fontFamily: "Onest" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="72" height="72" viewBox="0 0 48 48">
            <rect x="10" y="6" width="6.5" height="36" rx="3.25" fill="#1565c0" />
            <circle cx="27" cy="30" r="10.2" fill="none" stroke="#1565c0" strokeWidth="6.5" />
            <path d="M29.12 20.02 A10.2 10.2 0 0 1 36.46 26.18" fill="none" stroke="#29b6f6" strokeWidth="6.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -3 }}>bandcraft</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>Discover the truth about</div>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, color: "#1565c0" }}>your IELTS Writing band.</div>
        </div>
        <div style={{ fontSize: 28, color: "#5b6472" }}>All four official criteria · the evidence behind every band</div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Onest", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
