import { useState } from "react";

export function Target() {
  const [isHit, setIsHit] = useState(false);

  return (
    <mesh
      name="ShootingTarget"
      position={[0, 1.5, -3]}
      userData={{ onShotHit: () => setIsHit(true) }}
    >
      <sphereGeometry args={[0.2, 32, 16]} />
      <meshBasicMaterial color={isHit ? "#ef4444" : "#0284c7"} />
    </mesh>
  );
}
