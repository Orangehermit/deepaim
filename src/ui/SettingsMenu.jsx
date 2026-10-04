import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { Container, Text } from "@react-three/uikit";
import { Button, Switch } from "@react-three/uikit-default";
import { Euler, Quaternion } from "three";
import { useAppStore } from "../store/useAppStore";
import {
  WEAPON_POSE_DEG,
  WEAPON_POSITION_OFFSET_X_M, WEAPON_POSITION_OFFSET_Y_M, WEAPON_POSITION_OFFSET_Z_M,
  DUAL_WIELD_ENABLED,
} from "../shooting/shootingConfig.js";
import { NumericSetting } from "./NumericSetting.jsx";
import {
  MENU_DISTANCE, MENU_VERTICAL_OFFSET, MENU_HORIZONTAL_OFFSET,
  MENU_WIDTH, MENU_HEIGHT, WEAPON_MENU_WIDTH, WEAPON_MENU_HEIGHT,
  MENU_SCALE, PANEL_PADDING, PANEL_GAP,
  CATEGORY_TILE_SIZE, CATEGORY_TILE_GAP,
  TITLE_FONT_SIZE, LABEL_FONT_SIZE, VALUE_FONT_SIZE,
  PANEL_BACKGROUND_COLOR, TEXT_COLOR, PANEL_BORDER_RADIUS,
  SETTING_ROW_HEIGHT, SETTING_ROW_GAP, SETTING_GROUP_GAP,
  UI_POINTER_TYPE,
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
  const [pitch, setPitch] = useState(WEAPON_POSE_DEG.pitch);
  const [yaw, setYaw] = useState(WEAPON_POSE_DEG.yaw);
  const [roll, setRoll] = useState(WEAPON_POSE_DEG.roll);
  // Only the initial offset is converted from meters; UI state stays in cm.
  const [xOffsetCm, setXOffsetCm] = useState(WEAPON_POSITION_OFFSET_X_M * 100);
  const [yOffsetCm, setYOffsetCm] = useState(WEAPON_POSITION_OFFSET_Y_M * 100);
  const [zOffsetCm, setZOffsetCm] = useState(WEAPON_POSITION_OFFSET_Z_M * 100);
  const [dualWield, setDualWield] = useState(DUAL_WIELD_ENABLED);
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
          pointerEventsType={{ allow: UI_POINTER_TYPE }}
          pixelSize={MENU_SCALE}
          width={settingsPage === "weapon" ? WEAPON_MENU_WIDTH : MENU_WIDTH}
          height={settingsPage === "weapon" ? WEAPON_MENU_HEIGHT : MENU_HEIGHT}
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
            <Container width="100%" flexGrow={1} flexDirection="column" gap={SETTING_GROUP_GAP}>
              <Container width="100%" flexDirection="column" gap={SETTING_ROW_GAP}>
                <NumericSetting label="Pitch" value={pitch} min={-90} max={90} step={0.5} unit="°" onChange={setPitch} />
                <NumericSetting label="Yaw" value={yaw} min={-90} max={90} step={0.5} unit="°" onChange={setYaw} />
                <NumericSetting label="Roll" value={roll} min={-90} max={90} step={0.5} unit="°" onChange={setRoll} />
              </Container>
              <Container width="100%" flexDirection="column" gap={SETTING_ROW_GAP}>
                <NumericSetting label="X Offset" value={xOffsetCm} min={-10} max={10} step={0.5} unit="cm" onChange={setXOffsetCm} />
                <NumericSetting label="Y Offset" value={yOffsetCm} min={-10} max={10} step={0.5} unit="cm" onChange={setYOffsetCm} />
                <NumericSetting label="Z Offset" value={zOffsetCm} min={-10} max={10} step={0.5} unit="cm" onChange={setZOffsetCm} />
              </Container>
              <Container height={SETTING_ROW_HEIGHT} flexShrink={0} flexDirection="row" alignItems="center" gap={PANEL_GAP}>
                <Text fontSize={LABEL_FONT_SIZE}>Dual Wield:</Text>
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
              <Button variant="outline" height={64} flexShrink={0} marginTop="auto" onClick={() => setSettingsPage("home")}>
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
