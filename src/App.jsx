import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { Scene } from "./components/Scene";

const xrStore = createXRStore();

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

      <Canvas shadows camera={{ position: [3, 3, 3], fov: 30 }} gl={{ localClippingEnabled: true }}>
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

<Canvas
  shadows
  camera={{ position: [3, 3, 3], fov: 30 }}
  gl={{ localClippingEnabled: true }}
></Canvas>