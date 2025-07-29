import React from "react";

interface WatermarkProps {
  label: string;
  color?: string;
}

const Watermark: React.FC<WatermarkProps> = ({ label, color = "rgba(34,197,94,0.15)" }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 10,
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "5rem",
      fontWeight: 700,
      color,
      opacity: 0.3,
      transform: "rotate(-20deg)",
      userSelect: "none",
    }}
  >
    {label}
  </div>
);

export default Watermark;
