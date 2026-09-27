import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { Scene } from "./components/Scene";
import { RightHandGun } from "./xr/RightHandGun";

const xrStore = createXRStore({
  controller: {
    right: RightHandGun,
    left: { rayPointer: true },
  },
});

function App() {
  return (
    <>
      <button
        onClick={() => xrStore.enterVR()}
        style={{
          position: "absolute",
          zIndex: 1,
          left: "50%",
          bottom: "24px",
          transform: "translateX(-50%)",
        }}
      >
        Enter VR
      </button>

      <Canvas shadows camera={{ position: [0, 1.6, 0], fov: 50 }} gl={{ localClippingEnabled: true }}>
        <color attach="background" args={["#ececec"]} />

        <XR store={xrStore}>
          <Scene />
          <XROrigin />
        </XR>
      </Canvas>
    </>
  );
}

export default App;
