export default function TecSaludLogo({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Círculo con ondas */}
      <circle cx="30" cy="30" r="25" fill="#0056A3" />
      <path
        d="M20 25 Q25 20 30 25 T40 25 M20 30 Q25 25 30 30 T40 30 M20 35 Q25 30 30 35 T40 35"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
      />
      
      {/* Texto TecSalud */}
      <text x="65" y="38" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" fill="#0056A3">
        TecSalud
      </text>
    </svg>
  )
}