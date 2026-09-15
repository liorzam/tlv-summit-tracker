import { useEffect, useRef } from "react";
import Hls from "hls.js";

const SAVE_INTERVAL_SEC = 5; // throttle how often we persist position while playing
const COMPLETE_THRESHOLD = 0.9; // matches the 90%-watched rule in App.tsx

export default function Player({
  title,
  src,
  initialPosition,
  onProgress,
  onClose,
}: {
  title: string;
  src: string;
  initialPosition: number;
  /** Called whenever we have a fresh (position, duration) reading to persist. */
  onProgress: (positionSec: number, durationSec: number) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedAt = useRef(0);
  const resumedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    resumedRef.current = false;

    const resumeIfNeeded = () => {
      if (resumedRef.current) return;
      resumedRef.current = true;
      // "Continue watching": pick up from where playback was last paused,
      // as long as the session isn't already essentially finished.
      if (initialPosition > 0 && (!video.duration || initialPosition < video.duration * COMPLETE_THRESHOLD)) {
        video.currentTime = initialPosition;
      }
      video.play().catch(() => {
        // Autoplay can be blocked by the browser; the visible controls let the user hit play.
      });
    };

    const save = (force = false) => {
      const now = video.currentTime;
      const dur = video.duration;
      if (!isFinite(dur) || dur <= 0) return;
      if (!force && now - lastSavedAt.current < SAVE_INTERVAL_SEC) return;
      lastSavedAt.current = now;
      onProgress(Math.floor(now), Math.floor(dur));
    };

    const onTimeUpdate = () => save(false);
    const onPause = () => save(true);
    const onEnded = () => {
      const dur = video.duration;
      if (isFinite(dur) && dur > 0) onProgress(Math.floor(dur), Math.floor(dur));
    };
    const onLoadedMetadata = resumeIfNeeded;

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, resumeIfNeeded);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari has native HLS support.
      video.src = src;
    }

    return () => {
      save(true);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      hls?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className="player-overlay" onClick={onClose}>
      <div className="player-shell" onClick={(e) => e.stopPropagation()}>
        <div className="player-head">
          <h3>{title}</h3>
          <button className="player-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <video ref={videoRef} className="player-video" controls playsInline />
      </div>
    </div>
  );
}
