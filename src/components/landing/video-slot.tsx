"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";
import { isVideoFile, youtubeId, type LandingVideo } from "@/lib/landing-videos";

/** Video (YouTube or file) or, while no link is set, a placeholder with a pulsing play button. */
export function VideoSlot({
  video,
  title,
  soon,
  large = false,
}: {
  video: LandingVideo;
  title: string;
  soon: string;
  large?: boolean;
}) {
  const reduce = useReducedMotion();
  const yt = video.src ? youtubeId(video.src) : null;
  const size = large ? "h-20 w-20" : "h-12 w-12";

  return (
    <figure>
      <div className="aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-[#635BFF] via-[#4F7CFF] to-[#00C2FF] shadow-[0_24px_48px_-16px_rgba(50,50,93,0.4)]">
        {video.src && yt ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}`}
            title={title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : video.src && isVideoFile(video.src) ? (
          <video src={video.src} poster={video.poster} controls preload="metadata" playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white">
            <span className="relative flex items-center justify-center">
              {!reduce && (
                <motion.span
                  aria-hidden
                  className={`absolute rounded-full bg-white/50 ${size}`}
                  animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <span className={`relative flex items-center justify-center rounded-full bg-white text-[#635BFF] shadow-lg ${size}`}>
                <Play strokeWidth={2} className={large ? "h-8 w-8 translate-x-0.5" : "h-5 w-5 translate-x-px"} />
              </span>
            </span>
            <span className="text-sm font-medium text-white/90">{soon}</span>
          </div>
        )}
      </div>
      <figcaption className={`mt-3 font-semibold ${large ? "text-lg" : "text-sm"}`}>{title}</figcaption>
    </figure>
  );
}
