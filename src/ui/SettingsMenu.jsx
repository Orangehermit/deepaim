import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { Container, Text } from "@react-three/uikit";
import { Button, Slider, Switch } from "@react-three/uikit-default";
import { Euler, Quaternion } from "three";
import { useAppStore } from "../store/useAppStore";
import {
  MENU_DISTANCE, MENU_VERTICAL_OFFSET, MENU_HORIZONTAL_OFFSET,
  MENU_WIDTH, MENU_HEIGHT, MENU_SCALE, PANEL_PADDING, PANEL_GAP,
  CATEGORY_TILE_SIZE, CATEGORY_TILE_GAP,
  TITLE_FONT_SIZE, LABEL_FONT_SIZE, VALUE_FONT_SIZE,
  PANEL_BACKGROUND_COLOR, TEXT_COLOR, PANEL_BORDER_RADIUS,
} from "./uiConfig";

function SettingsHome({ onWeapon }) {
  return (
    <Container flexDirection="column" gap={CATEGORY_TILE_GAP}>
      {[["WEAPON", "SHOOTING"], ["AUDIO", "SYSTEM"]].map((row) => (
        <Container key={row[0]} flexDirection="row" gap={CATEGORY_TILE_GAP}>
          {row.map((category) => (
            <Button
              key={category}
              variant="outline"
              width={CATEGORY_TILE_SIZE}
              height={CATEGORY_TILE_SIZE}
              flexShrink={0}
              disabled={category !== "WEAPON"}
              onClick={category === "WEAPON" ? onWeapon : undefined}
            >
              <Text fontSize={LABEL_FONT_SIZE} lineHeight="120%">{category}</Text>
            </Button>
          ))}
        </Container>
      ))}
    </Container>
  );
}

export function SettingsMenu() {
  const session = useXR((state) => state.session);
  const menuOpen = useAppStore((state) => state.menuOpen);
  const settingsPage = useAppStore((state) => state.settingsPage);
  const setSettingsPage = useAppStore((state) => state.setSettingsPage);
  // Prototype values only. They deliberately do not change the weapon or persist.
  const [gunPitch, setGunPitch] = useState(25);
  const [dualWield, setDualWield] = useState(false);
  const panel = useRef(null);
  const getThreeState = useThree((state) => state.get);
  const orientation = useMemo(() => ({ quaternion: new Quaternion(), euler: new Euler() }), []);

  useLayoutEffect(() => {
    const placePanel = () => {
      const { camera } = getThreeState();
      camera.updateMatrixWorld();
      panel.current.position
        .set(MENU_HORIZONTAL_OFFSET, MENU_VERTICAL_OFFSET, -MENU_DISTANCE)
        .applyMatrix4(camera.matrixWorld);
      camera.getWorldQuaternion(orientation.quaternion);
      orientation.euler.setFromQuaternion(orientation.quaternion, "YXZ");
      panel.current.rotation.set(0, orientation.euler.y, 0);
      panel.current.updateMatrixWorld(true);
    };
    if (useAppStore.getState().menuOpen) placePanel();
    // Snapshot on the opening edge only; head movement never moves an open panel.
    return useAppStore.subscribe((state, previous) => {
      if (state.menuOpen && !previous.menuOpen) placePanel();
    });
  }, [getThreeState, orientation]);

  return (
    <group ref={panel} name="SettingsMenu">
      {session != null && menuOpen && (
        <Container
          pixelSize={MENU_SCALE}
          width={MENU_WIDTH}
          height={MENU_HEIGHT}
          padding={PANEL_PADDING}
          gap={PANEL_GAP}
          flexDirection="column"
          alignItems="center"
          backgroundColor={PANEL_BACKGROUND_COLOR}
          borderRadius={PANEL_BORDER_RADIUS}
          color={TEXT_COLOR}
        >
          <Text fontSize={TITLE_FONT_SIZE} fontWeight="bold">
            {settingsPage === "weapon" ? "WEAPON" : "SETTINGS"}
          </Text>
          {settingsPage === "weapon" ? (
            <Container width="100%" flexGrow={1} flexDirection="column" gap={PANEL_GAP}>
              <Text fontSize={LABEL_FONT_SIZE}>Gun Pitch</Text>
              <Container width="100%" paddingY={16}>
                <Slider min={0} max={45} step={1} value={gunPitch} onValueChange={setGunPitch} />
              </Container>
              <Text fontSize={VALUE_FONT_SIZE}>{`${gunPitch}°`}</Text>
              <Text fontSize={LABEL_FONT_SIZE}>Dual Wield</Text>
              <Container flexDirection="row" alignItems="center" gap={PANEL_GAP}>
                <Switch
                  checked={dualWield}
                  onCheckedChange={setDualWield}
                  // Enlarge the stock 44 x 24 control to a 66 x 36 mm ray target.
                  transformScaleX={1.5}
                  transformScaleY={1.5}
                  marginX={12}
                  marginY={8}
                />
                <Text fontSize={VALUE_FONT_SIZE}>{dualWield ? "ON" : "OFF"}</Text>
              </Container>
              <Button variant="outline" height={64} marginTop="auto" onClick={() => setSettingsPage("home")}>
                <Text fontSize={LABEL_FONT_SIZE} lineHeight="120%">BACK</Text>
              </Button>
            </Container>
          ) : (
            <SettingsHome onWeapon={() => setSettingsPage("weapon")} />
          )}
        </Container>
      )}
    </group>
  );
}
