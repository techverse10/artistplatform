/** Round avatar wrapped in the logo-gradient ring (the "story ring"). Size is in px. */
export function Avatar({ src, size, alt = "", ring = true }: { src: string | null | undefined; size: number; alt?: string; ring?: boolean }) {
  return (
    <span className={ring ? "avatar" : "avatar plain"} style={{ width: size, height: size }}>
      {src ? <img src={src} alt={alt} /> : <span className="ph" />}
    </span>
  );
}
