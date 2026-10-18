import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";

interface Props {
  title: string;
  days: { day: string; value: number }[];
  formatDay: (day: string) => string;
  height?: number;
}

// Barres par jour (une seule série, une couleur) : toucher une barre affiche
// sa valeur ; sinon on montre le dernier jour.
export default function DailyBars({ title, days, formatDay, height = 96 }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.value));
  const focus = selected ?? days.length - 1;
  const current = days[focus];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {current && (
          <Text style={styles.value}>
            {current.value} <Text style={styles.valueDay}>· {formatDay(current.day)}</Text>
          </Text>
        )}
      </View>
      <View style={[styles.plot, { height }]}>
        {days.map((d, i) => (
          <Pressable
            key={d.day}
            onPress={() => setSelected(i === selected ? null : i)}
            style={styles.hit}
            accessibilityLabel={`${formatDay(d.day)} : ${d.value}`}
          >
            <View
              style={[
                styles.bar,
                {
                  height: d.value === 0 ? 2 : Math.max(4, (d.value / max) * height),
                  backgroundColor: d.value === 0 ? "#E5E7EB" : Colors.primary,
                  opacity: i === focus || d.value === 0 ? 1 : 0.55,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{days[0] ? formatDay(days[0].day) : ""}</Text>
        <Text style={styles.axisText}>{days.length ? formatDay(days[days.length - 1].day) : ""}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: "#EEEEE8", borderRadius: 14, padding: 14, gap: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontSize: 13, fontWeight: "700", color: Colors.textLight },
  value: { fontSize: 16, fontWeight: "800", color: Colors.text },
  valueDay: { fontSize: 12, fontWeight: "400", color: Colors.textMuted },
  plot: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  hit: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: "row", justifyContent: "space-between" },
  axisText: { fontSize: 11, color: Colors.textMuted },
});
