const ASSET_BASE = import.meta.env?.BASE_URL ?? "/";

// Add tracks here; playback currently loops the first entry.
export const BGM_TRACKS = [
  {
    id: "observation_zero",
    src: `${ASSET_BASE}assets/audio/bgm/observation_zero.ogg`,
  },
];
