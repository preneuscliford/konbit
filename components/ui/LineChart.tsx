import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line, Polyline } from "react-native-svg";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";

export interface ChartSeries {
  label: string;
  color: string;
  points: { t: number; v: number }[];
}

// Petit graphique en courbes, en SVG pur (pas de bibliothèque lourde).
// Axe vertical commun à toutes les séries, valeurs min/max affichées.
export default function LineChart({
  series,
  height = 170,
  formatValue = (v: number) => v.toFixed(2),
  formatTime,
}: {
  series: ChartSeries[];
  height?: number;
  formatValue?: (v: number) => string;
  formatTime: (t: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return null;

  const minT = Math.min(...all.map((p) => p.t));
  const maxT = Math.max(...all.map((p) => p.t));
  const rawMin = Math.min(...all.map((p) => p.v));
  const rawMax = Math.max(...all.map((p) => p.v));
  const pad = Math.max((rawMax - rawMin) * 0.1, rawMax * 0.002);
  const minV = rawMin - pad;
  const maxV = rawMax + pad;

  const x = (t: number) => (maxT === minT ? 0 : ((t - minT) / (maxT - minT)) * width);
  const y = (v: number) => height - ((v - minV) / (maxV - minV)) * height;

  return (
    <View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height }]}>
          <Text style={styles.axisText}>{formatValue(rawMax)}</Text>
          <Text style={styles.axisText}>{formatValue(rawMin)}</Text>
        </View>
        <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <Svg width={width} height={height}>
              <Line x1={0} y1={y(rawMax)} x2={width} y2={y(rawMax)} stroke="#E5E7EB" strokeDasharray="4 4" />
              <Line x1={0} y1={y(rawMin)} x2={width} y2={y(rawMin)} stroke="#E5E7EB" strokeDasharray="4 4" />
              {series.map((s) =>
                s.points.length > 1 ? (
                  <Polyline
                    key={s.label}
                    points={s.points.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                ) : null,
              )}
            </Svg>
          )}
        </View>
      </View>
      <View style={styles.xAxis}>
        <Text style={styles.axisText}>{formatTime(minT)}</Text>
        <Text style={styles.axisText}>{formatTime(maxT)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", gap: 14, marginBottom: 8, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: Colors.textMuted },
  chartRow: { flexDirection: "row", gap: 6 },
  yAxis: { justifyContent: "space-between", paddingVertical: 2 },
  xAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, marginLeft: 46 },
  axisText: { fontSize: 10, color: Colors.textMuted },
});
