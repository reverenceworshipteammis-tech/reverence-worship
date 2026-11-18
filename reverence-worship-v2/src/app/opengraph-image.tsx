import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Reverence Worship Team — Hebrews 12:28";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage() {
  const logo = await readFile(
    join(process.cwd(), "public", "reverence-logo-transparent.png"),
  );
  const logoSource = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "36px",
          backgroundColor: "#f4f0e7",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            border: "1px solid #e8dfce",
            borderRadius: "30px",
            backgroundColor: "#fffdf8",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "42px",
              width: "64px",
              height: "5px",
              borderRadius: "999px",
              backgroundColor: "#d69b1c",
            }}
          />
          <div
            style={{
              width: "980px",
              height: "190px",
              display: "flex",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* ImageResponse needs a native image element for the local logo artwork. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              src={logoSource}
              width={980}
              height={429}
              style={{ position: "absolute", top: "-111px" }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              marginTop: "32px",
              color: "#283448",
              fontSize: "23px",
              fontWeight: 600,
              letterSpacing: "4px",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "2px",
                backgroundColor: "#d6b66e",
              }}
            />
            HEBREWS 12:28
            <div
              style={{
                width: "34px",
                height: "2px",
                backgroundColor: "#d6b66e",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
