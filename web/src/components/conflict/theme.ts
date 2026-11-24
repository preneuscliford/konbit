export type Theme = "light" | "dark";

/** Couleurs du mode « Évolution » (changement par rapport à la période précédente). */
export const CHANGE_COLORS = {
  light: { worse: "#c0262d", new: "#f08a3c", better: "#16a34a", same: "#a8a29e", nodata: "#d6d3d1" },
  dark: { worse: "#f0484f", new: "#ff9b4d", better: "#34d399", same: "#6b6f75", nodata: "#3f4145" },
} as const;

export const PALETTE = {
  light: {
    basemap: "https://tiles.openfreemap.org/styles/positron",
    line: "#9a958c",
    dept: "#57534e",
    select: "#0c0a09",
    group: "#00209f",
    status: { control: "#c0262d", influence: "#f08a3c", contested: "#d9a400", unclear: "#8f8a84" },
  },
  dark: {
    basemap: "https://tiles.openfreemap.org/styles/dark",
    line: "#4b5057",
    dept: "#9ca3af",
    select: "#fafaf9",
    group: "#6d8dff",
    status: { control: "#f0484f", influence: "#ff9b4d", contested: "#f2c94c", unclear: "#7c8189" },
  },
} as const;
