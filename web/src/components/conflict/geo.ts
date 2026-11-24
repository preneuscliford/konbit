"use client";

import { useEffect, useState } from "react";
import type { FeatureCollection, Geometry, Position } from "geojson";

// Limites administratives (CNIGS / OCHA HDX) chargées une seule fois et
// indexées par code : nom, commune, département et emprise de chaque zone.

export type Bounds = [number, number, number, number];

export type Place = {
  pcode: string;
  name: string;
  /** Commune de rattachement (sections communales seulement). */
  commune?: string;
  dept: string;
  level: "commune" | "section";
  bounds: Bounds;
};

export type Geo = {
  communes: FeatureCollection;
  sections: FeatureCollection;
  depts: FeatureCollection;
  places: Map<string, Place>;
};

function extend(b: Bounds, p: Position) {
  if (p[0] < b[0]) b[0] = p[0];
  if (p[1] < b[1]) b[1] = p[1];
  if (p[0] > b[2]) b[2] = p[0];
  if (p[1] > b[3]) b[3] = p[1];
}

function boundsOf(g: Geometry): Bounds {
  const b: Bounds = [180, 90, -180, -90];
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") extend(b, c as Position);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  if ("coordinates" in g) walk(g.coordinates);
  return b;
}

let cache: Promise<Geo> | null = null;

function load(): Promise<Geo> {
  cache ??= (async () => {
    const [communes, sections, depts] = await Promise.all(
      ["/geo/hti-communes.json", "/geo/hti-sections.json", "/geo/hti-departements.json"].map(async (u) => {
        const r = await fetch(u);
        if (!r.ok) throw new Error(`${u}: ${r.status}`);
        return (await r.json()) as FeatureCollection;
      }),
    );
    const places = new Map<string, Place>();
    for (const f of communes.features) {
      const p = f.properties as { pcode: string; name: string; dept: string };
      places.set(p.pcode, { ...p, level: "commune", bounds: boundsOf(f.geometry) });
    }
    for (const f of sections.features) {
      const p = f.properties as { pcode: string; name: string; commune: string; dept: string };
      places.set(p.pcode, { ...p, level: "section", bounds: boundsOf(f.geometry) });
    }
    return { communes, sections, depts, places };
  })();
  cache.catch(() => (cache = null));
  return cache;
}

export function useGeo() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    load().then(
      (g) => alive && setGeo(g),
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, []);
  return { geo, error };
}
