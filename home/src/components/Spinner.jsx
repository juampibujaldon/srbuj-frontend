import React from "react";

export default function Spinner({ size = 40 }) {
  return (
    <div
      style={{
        display: "inline-block",
        width: size,
        height: size,
        animation: "spin 1s linear infinite",
      }}
      className="srbuj-spinner"
    >
      {/* Reemplaza el SVG por el logo de Srbuj */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        style={{ display: "block" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ejemplo: círculo, reemplaza por tu logo */}
        <circle cx="32" cy="32" r="28" stroke="#f25f5c" strokeWidth="6" fill="none" />
        <text x="32" y="38" textAnchor="middle" fontSize="18" fill="#f25f5c" fontFamily="Arial">
          Srbuj
        </text>
      </svg>
      <style>
        {`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}