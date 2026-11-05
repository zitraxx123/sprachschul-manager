import { describe, it, expect } from "vitest";
import { youtubeId, isVideoFile } from "@/lib/landing-videos";

describe("landing videos", () => {
  it("extracts YouTube ids from common link formats", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://example.com/video.mp4")).toBeNull();
  });
  it("detects video files", () => {
    expect(isVideoFile("/videos/a.mp4")).toBe(true);
    expect(isVideoFile("/videos/a.webm?x=1")).toBe(true);
    expect(isVideoFile("https://youtu.be/dQw4w9WgXcQ")).toBe(false);
  });
});
