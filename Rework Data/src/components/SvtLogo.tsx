import React from 'react';

interface SvtLogoProps {
  className?: string;
}

export function SvtLogo({ className = 'h-10 w-10' }: SvtLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Shital Vacuum Treat logo">
      
      <path
        d="M24 3 41 9v18c0 9-7.5 15.5-17 18C14.5 42.5 7 36 7 27V9L24 3Z"
        fill="#b81b5c" />
      
      <text
        x="24"
        y="31"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="20"
        fontStyle="italic"
        fontWeight="700"
        fill="#ffffff">
        
        SVT
      </text>
    </svg>);

}