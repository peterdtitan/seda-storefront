import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { SITE } from "@/lib/site";

export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // The wordmark is artwork, not text, so the card carries the brand lettering
  // without ImageResponse having to load a typeface.
  const wordmark = await readFile(path.join(process.cwd(), "public/logo/wordmark-cream.png"));
  const mark = await readFile(path.join(process.cwd(), "public/logo/mark-cream.png"));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#5C0D00",
        position: "relative",
      }}
    >
      <img
        src={`data:image/png;base64,${mark.toString("base64")}`}
        width={340}
        height={524}
        style={{ position: "absolute", right: -70, top: -60, opacity: 0.1 }}
        alt=""
      />
      <img
        src={`data:image/png;base64,${wordmark.toString("base64")}`}
        width={520}
        height={236}
        alt=""
      />
      <div
        style={{
          marginTop: 26,
          color: "#FFFAE8",
          opacity: 0.82,
          fontSize: 30,
          letterSpacing: 6,
          textTransform: "uppercase",
        }}
      >
        Contemporary Adire
      </div>
    </div>,
    size,
  );
}
