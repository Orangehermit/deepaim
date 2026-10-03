import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { useAppStore } from "../store/useAppStore";
import { createMenuButtonTracker } from "./menuInput";

export function MenuInputController() {
  const session = useXR((state) => state.session);
  const buttons = useMemo(() => createMenuButtonTracker(), []);

  useEffect(() => {
    buttons.reset();
    useAppStore.getState().setMenuOpen(false);
    return () => {
      buttons.reset();
      useAppStore.getState().setMenuOpen(false);
    };
  }, [session, buttons]);

  useFrame(({ gl }) => {
    const activeSession = gl.xr.getSession();
    if (!gl.xr.isPresenting || activeSession == null) return;
    if (buttons.update(activeSession.inputSources)) useAppStore.getState().toggleMenu();
  }, -100); // After XR tracking (-1000), before pointers (-50) and shooting (0).

  return null;
}
