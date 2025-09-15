// /src/components/layout/UltraSpinner.tsx
import React from "react";

type Props = {
  size?: number;      // lado/diâmetro do SVG
  label?: string;     // texto opcional por baixo
  className?: string; // classes extra no wrapper
};

/**
 * UltraSpinner — usa apenas o SVG em /public/spinner.svg
 * Coloca o ficheiro em: public/spinner.svg
 */
export default function UltraSpinner({ size = 96, label, className = "" }: Props) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      style={{ fontFamily: "Montserrat, system-ui, sans-serif", color: "#fbfbfb" }}
    >
      <img
        src="/spinner.svg"       // ficheiro em public/spinner.svg
        alt={label || "A carregar"}
        style={{ width: size, height: size }}
        draggable={false}
      />
    </div>
  );
}
