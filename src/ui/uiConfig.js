// Placement is in camera-local meters; the panel is fixed in world space on open.
export const MENU_DISTANCE = 0.8;
export const MENU_VERTICAL_OFFSET = -0.2;
export const MENU_HORIZONTAL_OFFSET = 0;

// UIKit layout units. At this pixel size the panel is 0.56 m x 0.64 m.
export const MENU_WIDTH = 560;
export const MENU_HEIGHT = 640;
// Weapon rows need room for fixed text columns and 56 mm arrow targets.
export const WEAPON_MENU_WIDTH = 760;
export const WEAPON_MENU_HEIGHT = 720;
export const MENU_SCALE = 0.001; // Meters per UIKit layout unit (pixelSize).
export const PANEL_PADDING = 32;
export const PANEL_GAP = 24;
export const CATEGORY_TILE_SIZE = 220;
export const CATEGORY_TILE_GAP = 24;
export const TITLE_FONT_SIZE = 36;
export const LABEL_FONT_SIZE = 28;
export const VALUE_FONT_SIZE = 30;

// Single-line NumericSetting layout; dimensions use the same MENU_SCALE.
export const SETTING_ROW_HEIGHT = 56;
export const SETTING_LABEL_WIDTH = 120;
export const SETTING_VALUE_WIDTH = 92;
export const SETTING_UNIT_WIDTH = 40;
export const SETTING_COLON_WIDTH = 12;
export const SETTING_COLUMN_GAP = 8;
export const SETTING_SLIDER_MIN_WIDTH = 160;
export const SETTING_ARROW_BUTTON_SIZE = 56;
export const SETTING_ARROW_ICON_SIZE = 20;
export const SETTING_ROW_GAP = 8;
export const SETTING_GROUP_GAP = 16;
export const SETTING_LABEL_FONT_SIZE = 24;
export const SETTING_VALUE_FONT_SIZE = 28;
export const SETTING_VALUE_COLOR = "#c000a0";

export const PANEL_BACKGROUND_COLOR = "#f3f5f7";
export const TEXT_COLOR = "#17202a";
export const PANEL_BORDER_RADIUS = 16;

// Gun UI targeting and its visualization share the same range, in meters.
export const UI_POINTER_TYPE = "gun-ui";
export const UI_POINTER_MAX_DISTANCE = 3;
export const UI_POINTER_LINE_WIDTH = 0.002;
export const UI_POINTER_COLOR = "#00cfff";
export const UI_POINTER_HIT_DOT_SIZE = 0.006; // Radius in meters.
