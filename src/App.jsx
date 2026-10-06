import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { Scene } from "./components/Scene";
import { RightHandGun } from "./xr/RightHandGun";
import { MenuInputController } from "./xr/MenuInputController";
import { SettingsMenu } from "./ui/SettingsMenu";
import { preloadGunshot } from "./shooting/gunshotAudio";
import { startAudioSettingsSync } from "./audio/audioManager.js";
import { createXRAudioLifecycle } from "./audio/xrAudioLifecycle.js";

const xrStore = createXRStore({
  controller: {
    right: RightHandGun,
    left: { rayPointer: true },
  },
});
const xrAudioLifecycle = createXRAudioLifecycle(xrStore);

function App() {
  useEffect(() => {
    const disconnectAudioSession = xrAudioLifecycle.connect();
    const stopAudioSettingsSync = startAudioSettingsSync();
    void preloadGunshot();
    return () => {
      disconnectAudioSession();
      stopAudioSettingsSync();
    };
  }, []);

  return (
    <>
      <button
        onClick={() => {
          void xrAudioLifecycle.enterVR();
        }}
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
          <MenuInputController />
          <SettingsMenu />
        </XR>
      </Canvas>
    </>
  );
}

export default App;
