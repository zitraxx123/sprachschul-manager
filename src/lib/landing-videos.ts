/**
 * Videos on the landing page (section "Klasswerk in Aktion").
 *
 * To show a video, set `src` for the slot:
 *   - a YouTube link, e.g. "https://www.youtube.com/watch?v=XXXXXXXXXXX" or "https://youtu.be/XXXXXXXXXXX"
 *   - or a file in public/videos, e.g. "/videos/first-steps.mp4" (optional `poster`: "/videos/first-steps.jpg")
 * While `src` is null the slot shows a "video coming soon" placeholder.
 * The slot titles are translated in messages/*.json (landing_videos_v1 ... v3).
 */
export type LandingVideo = {
  id: "v1" | "v2" | "v3";
  src: string | null;
  poster?: string;
};

export const LANDING_VIDEOS: LandingVideo[] = [
  { id: "v1", src: null },
  { id: "v2", src: null },
  { id: "v3", src: null },
];

/** Returns the YouTube video id for watch / youtu.be / embed links, otherwise null. */
export function youtubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  return m ? m[1] : null;
}

export function isVideoFile(url: string): boolean {
  return /\.(mp4|webm)(\?.*)?$/i.test(url);
}
