export default function SvtLogo({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hexagon: pointy top & bottom */}
      <polygon
        points="50,2 95,27 95,77 50,102 5,77 5,27"
        fill="#1a1a1a"
        stroke="#000"
        strokeWidth="1.5"
      />
      {/* Stylized S — two opposing thick arcs */}
      <path
        d="M 38,28
           C 22,28 20,38 30,43
           L 40,48
           C 54,53 54,65 38,66
           C 28,66 24,62 24,62"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* VT text */}
      <text
        x="60" y="70"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="28"
        letterSpacing="1"
      >VT</text>
      {/* Small company text at bottom */}
      <text
        x="50" y="96"
        textAnchor="middle"
        fill="#aaa"
        fontFamily="Arial, sans-serif"
        fontSize="6"
        letterSpacing="0.5"
      >PUNE</text>
    </svg>
  );
}
