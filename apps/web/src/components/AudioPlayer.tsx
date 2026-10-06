"use client";

import { useMemo, useRef, useState } from "react";

/** Deterministic pseudo-waveform so the same track always looks the same. */
function bars(seed: string, n = 36) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1664525 + 1013904223) >>> 0;
    const v = 0.25 + ((h >>> 8) % 100) / 135;
    return Math.min(1, v + Math.sin(i / 3) * 0.12);
  });
}

export function Waveform({ seed, playing = false, progress = 0 }: { seed: string; playing?: boolean; progress?: number }) {
  const heights = useMemo(() => bars(seed), [seed]);
  return (
    <div className={playing ? "wave playing" : "wave"} aria-hidden>
      {heights.map((v, i) => (
        <i
          key={i}
          style={{
            height: `${v * 100}%`,
            animationDelay: `${(i % 9) * 0.07}s`,
            opacity: i / heights.length <= progress ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

export function AudioPlayer({ src, seed, title }: { src: string; seed: string; title?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  return (
    <div className="row" style={{ flexWrap: "nowrap", width: "100%" }}>
      <button className="btn primary" style={{ width: 48, height: 48, padding: 0, flex: "none" }} onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div className="small muted" style={{ marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>}
        <Waveform seed={seed} playing={playing} progress={progress} />
      </div>
      <audio
        ref={ref}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setProgress(a.duration ? a.currentTime / a.duration : 0);
        }}
      />
    </div>
  );
}
