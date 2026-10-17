import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

// Mini-courbe sans axes pour un aperçu : ligne + aire en fondu + point final.
export default function Sparkline({
  values,
  height = 56,
  color = "#FFFFFF",
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  const [width, setWidth] = useState(0);
  const pad = 4;

  let line = "";
  let area = "";
  let last: { x: number; y: number } | null = null;
  if (width > 0 && values.length > 1) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const points = values.map((v, i) => ({
      x: (i / (values.length - 1)) * (width - pad * 2) + pad,
      y: pad + (1 - (v - min) / span) * (height - pad * 2),
    }));
    line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    area = `${line} L${points[points.length - 1].x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z`;
    last = points[points.length - 1];
  }

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && values.length > 1 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#sparkFill)" />
          <Path d={line} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
          {last && <Circle cx={last.x} cy={last.y} r={3.5} fill={color} />}
        </Svg>
      )}
    </View>
  );
}
