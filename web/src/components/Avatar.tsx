import Image from "next/image";
import { profileImageUrl } from "@/lib/storage";

const COLORS = [
  "#00209F",
  "#D21034",
  "#0F766E",
  "#B45309",
  "#7C3AED",
  "#BE185D",
];

// Photo de profil, ou initiales sur une couleur stable (comme dans l'app).
export default function Avatar({
  name,
  avatarPath,
  seed,
  size = 44,
}: {
  name: string;
  avatarPath: string | null;
  seed: string;
  size?: number;
}) {
  if (avatarPath) {
    return (
      <Image
        src={profileImageUrl(avatarPath)}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const color =
    COLORS[[...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </span>
  );
}
