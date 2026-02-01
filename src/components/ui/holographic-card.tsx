import { useState, useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number; // How much tilt (default 15 degrees)
  glareOpacity?: number; // Glare intensity (default 0.3)
  holographicOpacity?: number; // Rainbow effect intensity (default 0.15)
}

export function HolographicCard({
  children,
  className = "",
  intensity = 15,
  glareOpacity = 0.3,
  holographicOpacity = 0.15,
}: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw mouse position values
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Spring physics for smooth animation
  const springConfig = { damping: 25, stiffness: 400 };
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [intensity, -intensity]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-intensity, intensity]), springConfig);

  // Gradient position for holographic effect
  const gradientX = useSpring(useTransform(mouseX, [0, 1], [0, 100]), springConfig);
  const gradientY = useSpring(useTransform(mouseY, [0, 1], [0, 100]), springConfig);

  // Glare position
  const glareX = useSpring(useTransform(mouseX, [0, 1], [-50, 150]), springConfig);
  const glareY = useSpring(useTransform(mouseY, [0, 1], [-50, 150]), springConfig);

  // Pre-compute all transforms at component level
  const holographicBackground = useTransform(
    [gradientX, gradientY],
    ([x, _y]) =>
      `linear-gradient(
        ${105 + (Number(x) - 50) * 0.5}deg,
        rgba(255, 0, 128, 0.4) 0%,
        rgba(255, 128, 0, 0.4) 14%,
        rgba(255, 255, 0, 0.4) 28%,
        rgba(0, 255, 128, 0.4) 42%,
        rgba(0, 128, 255, 0.4) 56%,
        rgba(128, 0, 255, 0.4) 70%,
        rgba(255, 0, 128, 0.4) 84%,
        rgba(255, 128, 0, 0.4) 100%
      )`
  );

  const holographicPosition = useTransform(
    [gradientX, gradientY],
    ([x, y]) => `${x}% ${y}%`
  );

  const glareBackground = useTransform(
    [glareX, glareY],
    ([x, y]) =>
      `radial-gradient(
        circle at ${x}% ${y}%,
        rgba(255, 255, 255, 0.8) 0%,
        rgba(255, 255, 255, 0.4) 20%,
        transparent 60%
      )`
  );

  const borderGlow = useTransform(
    [gradientX, gradientY],
    ([x, y]) => {
      const hue = (Number(x) + Number(y)) * 1.8;
      return `0 0 20px hsla(${hue}, 100%, 60%, 0.3),
              0 0 40px hsla(${hue + 60}, 100%, 60%, 0.2),
              inset 0 0 20px hsla(${hue + 120}, 100%, 60%, 0.1)`;
    }
  );

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Reset to center
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000,
        transformStyle: "preserve-3d",
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Main content */}
        <div className="relative z-10">{children}</div>

        {/* Holographic rainbow gradient overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden z-20"
          style={{
            opacity: isHovered ? holographicOpacity : 0,
            background: holographicBackground,
            backgroundSize: "200% 200%",
            backgroundPosition: holographicPosition,
            mixBlendMode: "color-dodge",
            transition: "opacity 0.3s ease",
          }}
        />

        {/* Glare/shine effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden z-30"
          style={{
            opacity: isHovered ? glareOpacity : 0,
            background: glareBackground,
            transition: "opacity 0.3s ease",
          }}
        />

        {/* Subtle border glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-lg z-0"
          style={{
            opacity: isHovered ? 0.6 : 0,
            boxShadow: borderGlow,
            transition: "opacity 0.3s ease",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
