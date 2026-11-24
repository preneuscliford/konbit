"use client";

import { useEffect, useRef } from "react";
import type { ExpressionSpecification, FilterSpecification, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Zone } from "@/lib/conflict/data";
import type { ZoneChange } from "@/lib/conflict/changes";
import type { Bounds, Geo } from "./geo";
import { CHANGE_COLORS, PALETTE, type Theme } from "./theme";

// Carte plein écran : fond OpenFreeMap (routes, lieux, relief), zones par
// commune ou par section communale, hachures pour les zones contestées.
// Les couches de zones passent sous les noms de lieux du fond de carte.

export const HAITI_BOUNDS: Bounds = [-74.55, 17.95, -71.6, 20.15];

export type Focus = { bounds: Bounds; nonce: number };

type Props = {
  geo: Geo;
  theme: Theme;
  zones: Zone[];
  /** Mode « Évolution » : changements par rapport à la période précédente. */
  changes: ZoneChange[] | null;
  selected: string | null;
  highlighted: string[];
  focus: Focus | null;
  /** Marge à gauche (panneau latéral) pour les recentrages. */
  padLeft: number;
  padBottom: number;
  onSelect: (pcode: string | null) => void;
};

const LEVELS = ["communes", "sections"] as const;

function isSection(pcode: string) {
  return pcode.includes("-");
}

function inList(pcodes: string[]): FilterSpecification {
  return ["in", ["get", "pcode"], ["literal", pcodes]] as unknown as FilterSpecification;
}

function colorBy(zones: Zone[], theme: Theme): ExpressionSpecification {
  const c = PALETTE[theme].status;
  if (zones.length === 0) return ["literal", c.unclear] as unknown as ExpressionSpecification;
  return ["match", ["get", "pcode"], ...zones.flatMap((z) => [z.pcode, c[z.status]]), c.unclear] as unknown as ExpressionSpecification;
}

/** Motif de hachures (zones contestées), dessiné une fois par thème. */
function hatch(color: string) {
  const size = 10;
  const ratio = 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * ratio;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(ratio, ratio);
  ctx.fillStyle = color + "2e";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = color + "cc";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const o of [-size, 0, size]) {
    ctx.moveTo(o, size);
    ctx.lineTo(o + size, 0);
  }
  ctx.stroke();
  return { data: ctx.getImageData(0, 0, size * ratio, size * ratio), ratio };
}

/** Mode « Évolution » : une couleur par type de changement, sans hachures. */
function applyChanges(map: MapLibreMap, changes: ZoneChange[], theme: Theme) {
  const c = CHANGE_COLORS[theme];
  for (const level of LEVELS) {
    const own = changes.filter((z) => (level === "sections") === isSection(z.pcode));
    const color = (own.length
      ? ["match", ["get", "pcode"], ...own.flatMap((z) => [z.pcode, c[z.change]]), c.nodata]
      : ["literal", c.nodata]) as unknown as ExpressionSpecification;
    map.setFilter(`${level}-zone-fill`, inList(own.map((z) => z.pcode)));
    map.setPaintProperty(`${level}-zone-fill`, "fill-color", color);
    map.setFilter(`${level}-zone-hatch`, inList([]));
    map.setFilter(`${level}-zone-line`, inList(own.map((z) => z.pcode)));
    map.setPaintProperty(`${level}-zone-line`, "line-color", color);
  }
}

function applyZones(map: MapLibreMap, zones: Zone[], theme: Theme, changes: ZoneChange[] | null) {
  if (changes) return applyChanges(map, changes, theme);
  for (const level of LEVELS) {
    const own = zones.filter((z) => (level === "sections") === isSection(z.pcode));
    const solid = own.filter((z) => z.status !== "contested").map((z) => z.pcode);
    const contested = own.filter((z) => z.status === "contested").map((z) => z.pcode);
    map.setFilter(`${level}-zone-fill`, inList(solid));
    map.setPaintProperty(`${level}-zone-fill`, "fill-color", colorBy(own, theme));
    map.setFilter(`${level}-zone-hatch`, inList(contested));
    map.setFilter(`${level}-zone-line`, inList(own.map((z) => z.pcode)));
    map.setPaintProperty(`${level}-zone-line`, "line-color", colorBy(own, theme));
  }
}

export default function MapView({ geo, theme, zones, changes, selected, highlighted, focus, padLeft, padBottom, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const camera = useRef<{ center: [number, number]; zoom: number } | null>(null);
  // Valeurs courantes lues par les écouteurs de la carte.
  const latest = useRef({ zones, changes, theme, selected, highlighted, onSelect });
  useEffect(() => {
    latest.current = { zones, changes, theme, selected, highlighted, onSelect };
  });

  // La carte est recréée quand le thème change (autre fond de carte).
  useEffect(() => {
    let cancelled = false;
    let created: MapLibreMap | null = null;
    readyRef.current = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const p = PALETTE[theme];
      const map = new maplibregl.Map({
        container: container.current,
        style: p.basemap,
        ...(camera.current ? { center: camera.current.center, zoom: camera.current.zoom } : { bounds: HAITI_BOUNDS }),
        // Le pays reste visible à côté du panneau et au-dessus de la frise.
        fitBoundsOptions: { padding: { top: 24, right: 24, left: 24 + padLeft, bottom: 24 + padBottom } },
        minZoom: 5.5,
        maxZoom: 14,
        // Assez haut pour un écran de téléphone vertical, sinon MapLibre
        // force un zoom plus fort et coupe le pays.
        maxBounds: [-78, 14.5, -68, 23.5],
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: {
          compact: true,
          customAttribution: "Boundaries © CNIGS (Haiti), via HDX (CC BY-IGO)",
        },
      });
      created = map;
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

      map.on("moveend", () => {
        const c = map.getCenter();
        camera.current = { center: [c.lng, c.lat], zoom: map.getZoom() };
      });

      map.on("load", () => {
        if (cancelled) return;
        // Les zones passent sous le premier calque de texte du fond de carte.
        const before = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
        const img = hatch(p.status.contested);
        map.addImage("hatch-contested", img.data, { pixelRatio: img.ratio });

        map.addSource("communes", { type: "geojson", data: geo.communes });
        map.addSource("sections", { type: "geojson", data: geo.sections });
        map.addSource("depts", { type: "geojson", data: geo.depts });

        const none = inList([]);
        for (const level of LEVELS) {
          map.addLayer({ id: `${level}-zone-fill`, type: "fill", source: level, filter: none, paint: { "fill-color": p.status.unclear, "fill-opacity": 0.5 } }, before);
          map.addLayer({ id: `${level}-zone-hatch`, type: "fill", source: level, filter: none, paint: { "fill-pattern": "hatch-contested", "fill-opacity": 0.9 } }, before);
        }
        map.addLayer({ id: "sections-line", type: "line", source: "sections", minzoom: 9.5, paint: { "line-color": p.line, "line-width": 0.5, "line-opacity": 0.6 } }, before);
        map.addLayer({ id: "communes-line", type: "line", source: "communes", minzoom: 7.5, paint: { "line-color": p.line, "line-width": 0.6, "line-opacity": 0.5 } }, before);
        for (const level of LEVELS) {
          map.addLayer({ id: `${level}-zone-line`, type: "line", source: level, filter: none, paint: { "line-color": p.status.unclear, "line-width": 1.4 } }, before);
        }
        map.addLayer({ id: "depts-line", type: "line", source: "depts", paint: { "line-color": p.dept, "line-width": 1.3, "line-dasharray": [3, 2] } }, before);
        for (const level of LEVELS) {
          map.addLayer({ id: `${level}-group`, type: "line", source: level, filter: none, paint: { "line-color": p.group, "line-width": 3, "line-dasharray": [1.5, 1] } });
          map.addLayer({ id: `${level}-selected`, type: "line", source: level, filter: none, paint: { "line-color": p.select, "line-width": 3 } });
        }
        // Zone de clic invisible (toutes les communes).
        map.addLayer({ id: "communes-hit", type: "fill", source: "communes", paint: { "fill-color": "#000", "fill-opacity": 0 } });

        map.on("click", (e) => {
          // Priorité : zone de section > zone de commune > commune.
          const hit = map.queryRenderedFeatures(e.point, {
            layers: ["sections-zone-fill", "sections-zone-hatch", "communes-zone-fill", "communes-zone-hatch", "communes-hit"],
          });
          const pcode = (hit[0]?.properties as { pcode?: string } | undefined)?.pcode ?? null;
          latest.current.onSelect(pcode);
        });
        map.on("mousemove", (e) => {
          const hit = map.queryRenderedFeatures(e.point, { layers: ["communes-hit"] });
          map.getCanvas().style.cursor = hit.length ? "pointer" : "";
        });

        readyRef.current = true;
        const cur = latest.current;
        applyZones(map, cur.zones, cur.theme, cur.changes);
        applySelection(map, cur.selected, cur.highlighted);
      });
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
      created?.remove();
      mapRef.current = null;
    };
    // geo est chargé une seule fois ; seul le thème recrée la carte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) {
      applyZones(map, zones, theme, changes);
      map.triggerRepaint();
    }
    // Nombre de zones appliquées (vérification automatique de la carte).
    container.current?.setAttribute("data-zones", String(changes ? changes.length : zones.length));
  }, [zones, theme, changes]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) applySelection(map, selected, highlighted);
  }, [selected, highlighted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.fitBounds(focus.bounds, {
      padding: { top: 60, right: 60, bottom: 60 + padBottom, left: 60 + padLeft },
      maxZoom: 11.5,
      duration: 800,
    });
    // Seul un nouveau `nonce` déclenche un recentrage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  return <div ref={container} className="h-full w-full" />;
}

function applySelection(map: MapLibreMap, selected: string | null, highlighted: string[]) {
  for (const level of LEVELS) {
    const sel = selected && (level === "sections") === isSection(selected) ? [selected] : [];
    map.setFilter(`${level}-selected`, inList(sel));
    map.setFilter(`${level}-group`, inList(highlighted.filter((p) => (level === "sections") === isSection(p))));
  }
}
