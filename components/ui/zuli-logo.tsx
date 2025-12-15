// ZULI Logo Component with Logomark
"use client"

import { cn } from "@/lib/utils"

interface ZuliLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "full" | "mark" | "text"
  theme?: "light" | "dark" | "gradient"
}

const sizeMap = {
  sm: { width: 80, height: 32, markSize: 24 },
  md: { width: 120, height: 48, markSize: 36 },
  lg: { width: 160, height: 64, markSize: 48 },
  xl: { width: 220, height: 88, markSize: 64 },
}

export function ZuliLogo({
  className,
  size = "md",
  variant = "full",
  theme = "dark",
}: ZuliLogoProps) {
  const { width, height, markSize } = sizeMap[size]

  // Logomark - The AI collaboration symbol (stylized cross/plus)
  const Logomark = ({ className: markClass }: { className?: string }) => (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={markClass}
    >
      <defs>
        <linearGradient id="zuliGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#AD11FF" />
          <stop offset="50%" stopColor="#7E85FC" />
          <stop offset="100%" stopColor="#52F1FA" />
        </linearGradient>
      </defs>
      {/* Main cross/plus shape with rounded corners representing AI + Human collaboration */}
      <path
        d="M45 5C45 2.23858 47.2386 0 50 0H60C62.7614 0 65 2.23858 65 5V35H95C97.7614 35 100 37.2386 100 40V50C100 52.7614 97.7614 55 95 55H65V85C65 87.7614 62.7614 90 60 90C52.268 90 45 82.732 45 75V55H15C12.2386 55 10 52.7614 10 50V40C10 37.2386 12.2386 35 15 35H45V5Z"
        fill="url(#zuliGradient)"
      />
      {/* Top right accent - representing digital/AI */}
      <path
        d="M65 5C65 2.23858 67.2386 0 70 0H80C82.7614 0 85 2.23858 85 5V15C85 22.732 78.732 29 71 29H65V5Z"
        fill="url(#zuliGradient)"
        opacity="0.7"
      />
    </svg>
  )

  // Text part of the logo
  const LogoText = ({ textColor }: { textColor: string }) => (
    <svg
      viewBox="0 0 180 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full"
      style={{ width: 'auto' }}
    >
      {/* Z */}
      <path
        d="M0 10H45L0 50H45"
        stroke={textColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* U */}
      <path
        d="M55 10V40C55 45.5228 59.4772 50 65 50H75C80.5228 50 85 45.5228 85 40V10"
        stroke={textColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* L */}
      <path
        d="M95 10V50H125"
        stroke={textColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* I */}
      <path
        d="M135 10V50"
        stroke={textColor}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )

  const textColor = theme === "light" ? "#FFFFFF" : theme === "dark" ? "#141633" : "#141633"

  if (variant === "mark") {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        <Logomark className={`w-${markSize} h-${markSize}`} />
      </div>
    )
  }

  if (variant === "text") {
    return (
      <div className={cn("inline-flex items-center", className)} style={{ width, height }}>
        <LogoText textColor={textColor} />
      </div>
    )
  }

  // Full logo with text and mark
  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      style={{ width, height }}
    >
      {/* ZULI Text */}
      <svg
        viewBox="0 0 160 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full flex-shrink-0"
        style={{ width: 'auto' }}
      >
        {/* Z - Bold geometric */}
        <path
          d="M5 8H38L5 42H38"
          stroke={textColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* U - Rounded bottom */}
        <path
          d="M48 8V34C48 38.4183 51.5817 42 56 42H64C68.4183 42 72 38.4183 72 34V8"
          stroke={textColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* L - Clean corner */}
        <path
          d="M82 8V42H108"
          stroke={textColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* I - Simple vertical */}
        <path
          d="M118 8V42"
          stroke={textColor}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Logomark */}
      <svg
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full flex-shrink-0"
        style={{ width: 'auto' }}
      >
        <defs>
          <linearGradient id="zuliMarkGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#AD11FF" />
            <stop offset="50%" stopColor="#7E85FC" />
            <stop offset="100%" stopColor="#52F1FA" />
          </linearGradient>
        </defs>
        {/* Stylized plus/cross - AI collaboration symbol */}
        <path
          d="M22 2C22 0.895 22.895 0 24 0H28C29.105 0 30 0.895 30 2V18H46C47.105 18 48 18.895 48 20V24C48 25.105 47.105 26 46 26H30V42C30 43.105 29.105 44 28 44C23.582 44 20 40.418 20 36V26H4C2.895 26 2 25.105 2 24V20C2 18.895 2.895 18 4 18H22V2Z"
          fill="url(#zuliMarkGradient)"
        />
        {/* Top right accent */}
        <path
          d="M30 2C30 0.895 30.895 0 32 0H38C39.105 0 40 0.895 40 2V8C40 12.418 36.418 16 32 16H30V2Z"
          fill="url(#zuliMarkGradient)"
          opacity="0.6"
        />
      </svg>
    </div>
  )
}

// Standalone Logomark for favicons, avatars, etc.
export function ZuliMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="zuliMarkGradientStandalone" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#AD11FF" />
          <stop offset="50%" stopColor="#7E85FC" />
          <stop offset="100%" stopColor="#52F1FA" />
        </linearGradient>
      </defs>
      {/* Main cross shape */}
      <path
        d="M22 2C22 0.895 22.895 0 24 0H28C29.105 0 30 0.895 30 2V18H46C47.105 18 48 18.895 48 20V24C48 25.105 47.105 26 46 26H30V42C30 43.105 29.105 44 28 44C23.582 44 20 40.418 20 36V26H4C2.895 26 2 25.105 2 24V20C2 18.895 2.895 18 4 18H22V2Z"
        fill="url(#zuliMarkGradientStandalone)"
      />
      {/* Top right accent */}
      <path
        d="M30 2C30 0.895 30.895 0 32 0H38C39.105 0 40 0.895 40 2V8C40 12.418 36.418 16 32 16H30V2Z"
        fill="url(#zuliMarkGradientStandalone)"
        opacity="0.6"
      />
    </svg>
  )
}

export default ZuliLogo
