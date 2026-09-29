/* eslint-disable @next/next/no-img-element -- merchant-provided URLs from arbitrary hosts */
import { parseImage } from "@/lib/presets";

export function PlanAvatar({ image, name, size = 48 }: { image: string; name: string; size?: number }) {
  const parsed = parseImage(image);
  const style = { width: size, height: size, borderRadius: size * 0.28 };
  if (parsed.kind === "url") {
    return <img src={parsed.url} alt="" style={style} className="shrink-0 border border-line object-cover" />;
  }
  const color = parsed.kind === "preset" ? parsed.color : "#7c6dff";
  return (
    <div
      style={{ ...style, background: `linear-gradient(135deg, ${color}, ${color}99)`, fontSize: size * 0.5 }}
      className="grid shrink-0 place-items-center text-white"
    >
      {parsed.kind === "preset" ? parsed.emoji : (name.trim()[0] ?? "M").toUpperCase()}
    </div>
  );
}
