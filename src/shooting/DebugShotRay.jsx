import { useEffect, useState } from "react";
import { Line } from "@react-three/drei";

const DISPLAY_DURATION_MS = 150;
const NO_RAYCAST = () => {};

// Snapshot world coordinates: the line must not follow the moving controller.
export function DebugShotRay({ shot }) {
  const [visibleShot, setVisibleShot] = useState(null);

  useEffect(() => {
    if (shot == null) return;
    setVisibleShot(shot);
    const timer = setTimeout(() => setVisibleShot(null), DISPLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [shot]);

  if (visibleShot == null) return null;

  return (
    <Line
      points={[visibleShot.origin, visibleShot.end]}
      color="#f59e0b"
      lineWidth={1}
      raycast={NO_RAYCAST}
      pointerEvents="none"
    />
  );
}
