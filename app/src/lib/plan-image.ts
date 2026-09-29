/**
 * Plan images are stored on-chain as a short string: either an https URL (uploaded image)
 * or a preset `preset:<emoji>:<color>` that needs no upload.
 */
export const PRESET_EMOJIS = ["📈", "🚀", "💬", "🎮", "🎵", "📚", "💎", "🧠", "🎬", "🏋️"];
export const PRESET_COLORS = ["#2f6fed", "#16a34a", "#e8a33d", "#e5484d", "#8e4ec6", "#0f172a"];

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

export const presetImage = (emoji: string, color: string) => `preset:${emoji}:${color}`;
