import { ImageResponse } from "next/og";

const ALLOWED = new Set([180, 192, 512]);

/** App icon for the PWA manifest and the iOS home screen (generated, no static assets needed). */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);
  if (!ALLOWED.has(size)) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          color: "#ffffff",
          fontSize: size * 0.56,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        S
      </div>
    ),
    { width: size, height: size }
  );
}
