import { Container, Svg, Text } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { formatSignedNumericValue, snapNumericValue } from "./numericValue.js";
import {
  SETTING_ROW_HEIGHT, SETTING_LABEL_WIDTH, SETTING_STEP_VALUE_WIDTH,
  SETTING_COLUMN_GAP, SETTING_ARROW_BUTTON_SIZE, SETTING_ARROW_ICON_SIZE,
  SETTING_LABEL_FONT_SIZE, SETTING_VALUE_FONT_SIZE, SETTING_VALUE_COLOR,
  ARROW_COLOR,
} from "./uiConfig.js";

// The default UIKit font lacks triangle glyphs; use an inline vector icon.
const ARROW_LEFT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17 3 L5 12 L17 21 Z"/></svg>';

function StepArrowButton({ direction, onClick }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      backgroundColor="transparent"
      hover={{ backgroundColor: "transparent" }}
      width={SETTING_ARROW_BUTTON_SIZE}
      height={SETTING_ARROW_BUTTON_SIZE}
      flexShrink={0}
      padding={0}
      onClick={onClick}
    >
      <Svg
        content={ARROW_LEFT}
        width={SETTING_ARROW_ICON_SIZE}
        height={SETTING_ARROW_ICON_SIZE}
        transformRotateZ={direction > 0 ? 180 : 0}
        color={ARROW_COLOR}
        pointerEvents="none"
      />
    </Button>
  );
}

export function NumericStepSetting({ label, value, min, max, step, unit, onChange }) {
  const current = snapNumericValue(value, min, max, step);
  const changeStep = (direction) => {
    const next = snapNumericValue(current + direction * step, min, max, step);
    if (next !== current) onChange(next);
  };

  return (
    <Container
      width="100%"
      height={SETTING_ROW_HEIGHT}
      flexShrink={0}
      flexDirection="row"
      justifyContent="flex-start"
      alignItems="center"
      gap={SETTING_COLUMN_GAP}
    >
      <Text width={SETTING_LABEL_WIDTH} flexShrink={0} fontSize={SETTING_LABEL_FONT_SIZE} textAlign="left" wordBreak="keep-all">
        {label}
      </Text>
      {/* Click follows trigger release; no draft/pose changes while held. */}
      <StepArrowButton direction={-1} onClick={() => changeStep(-1)} />
      <Text
        width={SETTING_STEP_VALUE_WIDTH}
        flexShrink={0}
        fontSize={SETTING_VALUE_FONT_SIZE}
        fontWeight="bold"
        color={SETTING_VALUE_COLOR}
        textAlign="center"
        wordBreak="keep-all"
      >
        {formatSignedNumericValue(current, unit)}
      </Text>
      <StepArrowButton direction={1} onClick={() => changeStep(1)} />
    </Container>
  );
}
