interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left arc — red */}
      <path
        d="M50 6 A44 44 0 0 0 50 94"
        stroke="#dc2626"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right arc — blue */}
      <path
        d="M50 6 A44 44 0 0 1 50 94"
        stroke="#1d4ed8"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Red "T" — left half */}
      <text
        x="26"
        y="68"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900"
        fontSize="54"
        fill="#dc2626"
        letterSpacing="-2"
      >
        T
      </text>
      {/* Blue "A" — right half */}
      <text
        x="46"
        y="68"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900"
        fontSize="54"
        fill="#1d4ed8"
        letterSpacing="-2"
      >
        A
      </text>
    </svg>
  );
}
