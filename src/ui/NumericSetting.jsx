import { Container, Svg, Text } from "@react-three/uikit";
import { Button, Slider } from "@react-three/uikit-default";
import { snapNumericValue } from "./numericValue.js";
import {
  SETTING_ROW_HEIGHT, SETTING_LABEL_WIDTH, SETTING_VALUE_WIDTH,
  SETTING_UNIT_WIDTH, SETTING_COLON_WIDTH, SETTING_COLUMN_GAP,
  SETTING_SLIDER_MIN_WIDTH, SETTING_ARROW_BUTTON_SIZE, SETTING_ARROW_ICON_SIZE,
  SETTING_LABEL_FONT_SIZE, SETTING_VALUE_FONT_SIZE, SETTING_VALUE_COLOR,
  TEXT_COLOR,
} from "./uiConfig.js";

// The default UIKit font lacks the triangle glyphs. Use an inline vector icon.
const ARROW_LEFT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17 3 L5 12 L17 21 Z"/></svg>';

function centerSliderThumb(slider) {
  // Stock UIKit offsets the thumb for an 8px track. Our 56px hit area is centered.
  slider?.thumb.setProperties({ transformTranslateY: 0 });
}

export function NumericSetting({ label, value, min, max, step, unit, onChange }) {
  const current = snapNumericValue(value, min, max, step);
  const changeValue = (next) => onChange(snapNumericValue(next, min, max, step));

  return (
    <Container
      width="100%"
      height={SETTING_ROW_HEIGHT}
      flexShrink={0}
      flexDirection="row"
      alignItems="center"
      gap={SETTING_COLUMN_GAP}
    >
      <Text width={SETTING_LABEL_WIDTH} flexShrink={0} fontSize={SETTING_LABEL_FONT_SIZE} wordBreak="keep-all">
        {label}
      </Text>
      <Text
        width={SETTING_VALUE_WIDTH}
        flexShrink={0}
        fontSize={SETTING_VALUE_FONT_SIZE}
        fontWeight="bold"
        color={SETTING_VALUE_COLOR}
        textAlign="right"
        wordBreak="keep-all"
      >
        {current.toFixed(1)}
      </Text>
      <Text width={SETTING_UNIT_WIDTH} flexShrink={0} fontSize={SETTING_LABEL_FONT_SIZE}>
        {unit}
      </Text>
      <Text width={SETTING_COLON_WIDTH} flexShrink={0} fontSize={SETTING_LABEL_FONT_SIZE}>:</Text>
      <Button
        variant="outline"
        size="icon"
        width={SETTING_ARROW_BUTTON_SIZE}
        height={SETTING_ARROW_BUTTON_SIZE}
        flexShrink={0}
        padding={0}
        disabled={current <= min}
        onClick={() => changeValue(current - step)}
      >
        <Svg content={ARROW_LEFT} width={SETTING_ARROW_ICON_SIZE} height={SETTING_ARROW_ICON_SIZE} color={TEXT_COLOR} pointerEvents="none" />
      </Button>
      <Slider
        ref={centerSliderThumb}
        flexGrow={1}
        flexShrink={0}
        flexBasis={0}
        minWidth={SETTING_SLIDER_MIN_WIDTH}
        height={SETTING_ROW_HEIGHT}
        justifyContent="center"
        // UIKit snaps relative to zero; shift its range to share the min-based grid.
        min={0}
        max={max - min}
        step={step}
        value={current - min}
        onValueChange={(next) => changeValue(next + min)}
      />
      <Button
        variant="outline"
        size="icon"
        width={SETTING_ARROW_BUTTON_SIZE}
        height={SETTING_ARROW_BUTTON_SIZE}
        flexShrink={0}
        padding={0}
        disabled={current >= max}
        onClick={() => changeValue(current + step)}
      >
        <Svg content={ARROW_LEFT} width={SETTING_ARROW_ICON_SIZE} height={SETTING_ARROW_ICON_SIZE} transformRotateZ={180} color={TEXT_COLOR} pointerEvents="none" />
      </Button>
    </Container>
  );
}
