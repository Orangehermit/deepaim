import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { Container, Text } from "@react-three/uikit";
import { Button, Switch } from "@react-three/uikit-default";
import { Euler, Quaternion } from "three";
import { useAppStore, selectWeaponUnsavedChanges, selectAudioUnsavedChanges } from "../store/useAppStore";
import { SETTINGS_CONFIG } from "../userSetting/userSettingConfig.js";
import { NumericStepSetting } from "./NumericStepSetting.jsx";
import { NumericSetting } from "./NumericSetting.jsx";
import {
  MENU_DISTANCE, MENU_VERTICAL_OFFSET, MENU_HORIZONTAL_OFFSET,
  MENU_WIDTH, MENU_HEIGHT, WEAPON_MENU_WIDTH, WEAPON_MENU_HEIGHT,
  AUDIO_MENU_WIDTH, AUDIO_MENU_HEIGHT, AUDIO_SETTING_LABEL_WIDTH,
  MENU_SCALE, PANEL_PADDING, PANEL_GAP,
  CATEGORY_TILE_SIZE, CATEGORY_TILE_GAP,
  TITLE_FONT_SIZE, LABEL_FONT_SIZE, VALUE_FONT_SIZE,
  PANEL_BACKGROUND_COLOR, TEXT_COLOR, PANEL_BORDER_RADIUS,
  MENU_TEXT_COLOR, MENU_TEXT_HOVER_COLOR, BUTTON_TEXT_COLOR,
  BUTTON_TP_TEXT_COLOR, BUTTON_TP_TEXT_HOVER_COLOR,
  SETTING_ROW_HEIGHT, SETTING_ROW_GAP, SETTING_GROUP_GAP,
  UI_POINTER_TYPE,
  SAVE_FEEDBACK_DURATION_MS,
} from "./uiConfig";

const WEAPON_NUMERIC_GROUPS = [
  [["pitch", "Pitch"], ["yaw", "Yaw"], ["roll", "Roll"]],
  [["xOffset", "X Offset"], ["yOffset", "Y Offset"], ["zOffset", "Z Offset"]],
];
const AUDIO_VOLUME_ROWS = [["bgmVolume", "BGM Volume"], ["gunshotVolume", "Gun Shot Volume"]];

function SettingsHome({ onCategory }) {
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
              color={MENU_TEXT_COLOR}
              hover={{ color: MENU_TEXT_HOVER_COLOR }}
              disabled={category !== "WEAPON" && category !== "AUDIO"}
              onClick={category === "WEAPON" || category === "AUDIO" ? () => onCategory(category.toLowerCase()) : undefined}
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
  const weaponSettings = useAppStore((state) => state.weaponSettingsPreview ?? state.weaponSettings);
  const audioSettings = useAppStore((state) => state.audioSettingsPreview ?? state.audioSettings);
  const unsavedChanges = useAppStore((state) => state.settingsPage === "audio"
    ? selectAudioUnsavedChanges(state) : selectWeaponUnsavedChanges(state));
  const updateWeaponDraft = useAppStore((state) => state.updateWeaponDraft);
  const resetWeaponDraft = useAppStore((state) => state.resetWeaponDraft);
  const saveWeaponSettings = useAppStore((state) => state.saveWeaponSettings);
  const updateAudioDraft = useAppStore((state) => state.updateAudioDraft);
  const resetAudioDraft = useAppStore((state) => state.resetAudioDraft);
  const saveAudioSettings = useAppStore((state) => state.saveAudioSettings);
  const editingSettings = settingsPage === "weapon" || settingsPage === "audio";
  const [savedPage, setSavedPage] = useState(null);
  const saved = savedPage === settingsPage;
  const savedTimer = useRef(null);
  // Dual Wield remains a UI-only prototype switch for a later phase.
  const [dualWield, setDualWield] = useState(SETTINGS_CONFIG.weapon.dualWield.initialValue);
  const panel = useRef(null);
  const getThreeState = useThree((state) => state.get);
  const orientation = useMemo(() => ({ quaternion: new Quaternion(), euler: new Euler() }), []);

  const save = () => {
    const commit = settingsPage === "audio" ? saveAudioSettings : saveWeaponSettings;
    if (!commit()) return;
    clearTimeout(savedTimer.current);
    setSavedPage(settingsPage);
    // Feedback only: the commit above is immediate and every input stays active.
    savedTimer.current = setTimeout(() => {
      savedTimer.current = null;
      setSavedPage(null);
    }, SAVE_FEEDBACK_DURATION_MS);
  };

  useEffect(() => {
    if (!menuOpen || !editingSettings || session == null || unsavedChanges ||
      (savedPage != null && savedPage !== settingsPage)) {
      clearTimeout(savedTimer.current);
      savedTimer.current = null;
      setSavedPage(null);
    }
  }, [menuOpen, settingsPage, editingSettings, session, unsavedChanges, savedPage]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

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
          width={settingsPage === "weapon" ? WEAPON_MENU_WIDTH : settingsPage === "audio" ? AUDIO_MENU_WIDTH : MENU_WIDTH}
          height={settingsPage === "weapon" ? WEAPON_MENU_HEIGHT : settingsPage === "audio" ? AUDIO_MENU_HEIGHT : MENU_HEIGHT}
          padding={PANEL_PADDING}
          gap={PANEL_GAP}
          flexDirection="column"
          alignItems="center"
          backgroundColor={PANEL_BACKGROUND_COLOR}
          borderRadius={PANEL_BORDER_RADIUS}
          color={TEXT_COLOR}
        >
          <Text fontSize={TITLE_FONT_SIZE} fontWeight="bold">
            {editingSettings ? settingsPage.toUpperCase() : "SETTINGS"}
          </Text>
          {editingSettings ? (
            <Container width="100%" flexGrow={1} flexDirection="column" gap={SETTING_GROUP_GAP}>
              {settingsPage === "weapon" ? (
                <Container width="100%" flexDirection="column" gap={SETTING_GROUP_GAP}>
                  {WEAPON_NUMERIC_GROUPS.map((group) => (
                    <Container key={group[0][0]} width="100%" flexDirection="column" gap={SETTING_ROW_GAP}>
                      {group.map(([key, label]) => {
                        const config = SETTINGS_CONFIG.weapon[key];
                        return (
                          <NumericStepSetting
                            key={key}
                            label={label}
                            value={weaponSettings[key]}
                            min={config.min}
                            max={config.max}
                            step={config.step}
                            unit={config.unit}
                            onChange={(value) => updateWeaponDraft(key, value)}
                          />
                        );
                      })}
                    </Container>
                  ))}
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
                </Container>
              ) : (
                <Container width="100%" flexDirection="column" gap={SETTING_GROUP_GAP}>
                  <Container height={SETTING_ROW_HEIGHT} flexShrink={0} flexDirection="row" alignItems="center" gap={PANEL_GAP}>
                    <Text fontSize={LABEL_FONT_SIZE}>BGM:</Text>
                    <Switch
                      checked={audioSettings.bgmEnabled}
                      onCheckedChange={(value) => updateAudioDraft("bgmEnabled", value)}
                      transformScaleX={1.5}
                      transformScaleY={1.5}
                      marginX={12}
                      marginY={8}
                    />
                    <Text fontSize={VALUE_FONT_SIZE}>{audioSettings.bgmEnabled ? "ON" : "OFF"}</Text>
                  </Container>
                  <Container width="100%" flexDirection="column" gap={SETTING_ROW_GAP}>
                    {AUDIO_VOLUME_ROWS.map(([key, label]) => {
                      const config = SETTINGS_CONFIG.audio[key];
                      return (
                        <NumericSetting
                          key={key}
                          label={label}
                          labelWidth={AUDIO_SETTING_LABEL_WIDTH}
                          fractionDigits={0}
                          value={audioSettings[key]}
                          min={config.min}
                          max={config.max}
                          step={config.step}
                          unit={config.unit}
                          onChange={(value) => updateAudioDraft(key, value)}
                        />
                      );
                    })}
                  </Container>
                </Container>
              )}
              <Container
                width="100%"
                flexShrink={0}
                flexDirection="column"
                gap={SETTING_ROW_GAP}
                marginTop="auto"
              >
                <Button
                  variant="ghost"
                  borderWidth={0}
                  alignSelf="flex-end"
                  width="auto"
                  height="auto"
                  minHeight={SETTING_ROW_HEIGHT}
                  flexShrink={0}
                  paddingX={PANEL_GAP}
                  paddingY={SETTING_ROW_GAP}
                  backgroundColor="transparent"
                  color={BUTTON_TP_TEXT_COLOR}
                  hover={{ backgroundColor: "transparent", color: BUTTON_TP_TEXT_HOVER_COLOR }}
                  onClick={save}
                >
                  <Text fontSize={LABEL_FONT_SIZE} lineHeight="120%">
                    {saved ? "SAVED" : unsavedChanges ? "SAVE *" : "SAVE"}
                  </Text>
                </Button>
                <Button
                  variant="ghost"
                  borderWidth={0}
                  alignSelf="flex-end"
                  width="auto"
                  height="auto"
                  minHeight={SETTING_ROW_HEIGHT}
                  flexShrink={0}
                  paddingX={PANEL_GAP}
                  paddingY={SETTING_ROW_GAP}
                  backgroundColor="transparent"
                  color={BUTTON_TP_TEXT_COLOR}
                  hover={{ backgroundColor: "transparent", color: BUTTON_TP_TEXT_HOVER_COLOR }}
                  onClick={settingsPage === "audio" ? resetAudioDraft : resetWeaponDraft}
                >
                  <Text fontSize={LABEL_FONT_SIZE} lineHeight="120%">RESET</Text>
                </Button>
                <Button
                  variant="outline"
                  height={64}
                  flexShrink={0}
                  color={BUTTON_TEXT_COLOR}
                  hover={{ color: BUTTON_TEXT_COLOR }}
                  onClick={() => setSettingsPage("home")}
                >
                  <Text fontSize={LABEL_FONT_SIZE} lineHeight="120%">BACK</Text>
                </Button>
              </Container>
            </Container>
          ) : (
            <SettingsHome onCategory={setSettingsPage} />
          )}
        </Container>
      )}
    </group>
  );
}
