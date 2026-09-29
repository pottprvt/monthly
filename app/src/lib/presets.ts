/** Plan images that need no upload: an emoji on a colored tile. Stored on-chain as `preset:<emoji>:<color>`. */
export const PRESET_EMOJIS = ["📈", "🚀", "🎮", "🎵", "📚", "💎", "🧠", "🎬", "☕", "🏋️"];
export const PRESET_COLORS = ["#7c6dff", "#3ccf7a", "#f0a53a", "#f06a6a", "#3aa7f0", "#e05fd0"];

export type PlanImage =
  | { kind: "preset"; emoji: string; color: string }
  | { kind: "url"; url: string }
  | { kind: "none" };

export function parseImage(image: string): PlanImage {
  if (image.startsWith("preset:")) {
    const [, emoji, color] = image.split(":");
    if (emoji && color) return { kind: "preset", emoji, color };
  }
  if (/^https:\/\/\S+$/.test(image)) return { kind: "url", url: image };
  return { kind: "none" };
}

export function presetImage(emoji: string, color: string): string {
  return `preset:${emoji}:${color}`;
}
