import React, { useRef, useState } from "react";

interface ResizableBlockProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  style?: React.CSSProperties;
  editMode?: boolean;
  position?: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

const ResizableBlock: React.FC<ResizableBlockProps> = ({
  children,
  defaultWidth = 400,
  minWidth = 200,
  maxWidth = 1200,
  defaultHeight = 200,
  minHeight = 100,
  maxHeight = 800,
  style = {},
  editMode = false,
  position,
  onPositionChange,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const resizing = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [localPos, setLocalPos] = useState<{ x: number; y: number }>(position || { x: 0, y: 0 });

  // Handle drag
  const onDragStart = (e: React.MouseEvent) => {
    if (!editMode) return;
    setDragging(true);
    setDragOffset({ x: e.clientX - localPos.x, y: e.clientY - localPos.y });
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
  };
  const onDragMove = (e: MouseEvent) => {
    if (!dragging || !dragOffset) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    setLocalPos({ x: newX, y: newY });
    if (onPositionChange) onPositionChange({ x: newX, y: newY });
  };
  const onDragEnd = () => {
    setDragging(false);
    setDragOffset(null);
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
  };

  // Handle resize
  const onMouseDown = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    resizing.current = { x: e.clientX, y: e.clientY, w: width, h: height };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    let newWidth = resizing.current.w + (e.clientX - resizing.current.x);
    let newHeight = resizing.current.h + (e.clientY - resizing.current.y);
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    setWidth(newWidth);
    setHeight(newHeight);
  };
  const onMouseUp = () => {
    resizing.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  // Use position from props if provided
  React.useEffect(() => {
    if (position) setLocalPos(position);
  }, [position]);

  return (
    <div
      style={{
        position: editMode ? "absolute" : "relative",
        left: editMode ? localPos.x : undefined,
        top: editMode ? localPos.y : undefined,
        width,
        height,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,
        boxShadow: editMode ? "0 0 0 2px #f00" : undefined,
        ...style,
      }}
    >
      {/* Drag handle (top bar) */}
      {editMode && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 24,
            background: "rgba(255,0,0,0.08)",
            cursor: "move",
            zIndex: 20,
          }}
          onMouseDown={onDragStart}
          title="Drag block"
        />
      )}
      {/* Watermark overlay */}
      {editMode && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            color: "#fff",
            background: "rgba(255,0,0,0.7)",
            padding: "2px 12px",
            fontWeight: "bold",
            fontSize: 18,
            borderRadius: 6,
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          Edit Mode
        </div>
      )}
      <div style={{ width: "100%", height: "100%" }}>{children}</div>
      {/* Resize handle */}
      {editMode && (
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 16,
            height: 16,
            background: "#eee",
            borderRadius: 4,
            cursor: "nwse-resize",
            zIndex: 10,
          }}
          onMouseDown={onMouseDown}
          title="Resize block"
        />
      )}
    </div>
  );
};

export default ResizableBlock;
