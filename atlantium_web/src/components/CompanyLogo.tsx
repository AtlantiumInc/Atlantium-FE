import { useState } from "react";

/* Deterministic hue per company so monograms are stable and varied. */
function hue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

/**
 * Tiny company mark: the resolved logo when we have one (svgl SVG or
 * favicon), a colored monogram when we don't or the image 404s. Sized to sit
 * inline beside a company name without moving the layout.
 */
export function CompanyLogo({ name, logo, size = 16 }: { name: string; logo?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const px = { width: size, height: size };
  if (logo && !broken) {
    return (
      <img
        src={logo}
        alt=""
        loading="lazy"
        style={px}
        className="shrink-0 rounded-[4px] bg-white/5 object-contain"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      style={{ ...px, backgroundColor: `hsl(${hue(name)} 45% 28%)` }}
      className="shrink-0 rounded-[4px] flex items-center justify-center text-[9px] font-bold text-white/80 uppercase"
      aria-hidden
    >
      {name.trim()[0] ?? "?"}
    </span>
  );
}
