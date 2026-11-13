import React from "react";
import Svg, { Path } from "react-native-svg";

// Icône de partage de Konbit 509 : une boîte ouverte d'où sort une flèche
// courbe (même trait que les icônes Lucide de l'app).
export default function ShareIcon({ size = 20, color, strokeWidth = 2 }: { size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 8H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
      <Path d="M9 16c0-5 3.5-8 10-8" />
      <Path d="M15 4l4 4-4 4" />
    </Svg>
  );
}
