import { inflate } from "pako";

// Décodage PNG et calcul de contraste pour la barre d'état (sans dépendance
// à Expo, donc testable seul). Utilisé par lib/imageTone.ts.

export interface CoverTone {
  // "light" = icônes blanches (fond sombre), "dark" = icônes noires (fond clair).
  style: "light" | "dark";
  // Trop de pixels où même la meilleure couleur reste sous 3:1 : ajouter un voile.
  scrim: boolean;
}

const MIN_CONTRAST = 3; // WCAG 2.x, éléments graphiques et icônes
const SCRIM_SHARE = 0.25;

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (r: number, g: number, b: number) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
const contrastWithWhite = (l: number) => 1.05 / (l + 0.05);
const contrastWithBlack = (l: number) => (l + 0.05) / 0.05;

// Décodage PNG minimal (8 bits, non entrelacé : ce que produit expo-image-manipulator).
export function decodePng(bytes: Uint8Array): { width: number; height: number; channels: number; pixels: Uint8Array } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8; // signature
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Uint8Array[] = [];
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      if (data[8] !== 8 || data[12] !== 0) throw new Error("png_unsupported");
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType as 0 | 2 | 4 | 6];
  if (!channels) throw new Error("png_unsupported");

  const compressed = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const chunk of idat) {
    compressed.set(chunk, pos);
    pos += chunk.length;
  }
  const raw = inflate(compressed);

  // Annule les filtres PNG ligne par ligne (None, Sub, Up, Average, Paeth).
  const stride = width * channels;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = value & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

export function analyzePixels(pixels: Uint8Array, channels: number): CoverTone {
  const count = pixels.length / channels;
  const lums = new Float64Array(count);
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const o = i * channels;
    const l = channels >= 3 ? luminance(pixels[o], pixels[o + 1], pixels[o + 2]) : luminance(pixels[o], pixels[o], pixels[o]);
    lums[i] = l;
    sum += l;
  }
  const mean = sum / count;
  const style = contrastWithWhite(mean) >= contrastWithBlack(mean) ? "light" : "dark";
  const contrastOf = style === "light" ? contrastWithWhite : contrastWithBlack;
  let weak = 0;
  for (let i = 0; i < count; i++) if (contrastOf(lums[i]) < MIN_CONTRAST) weak++;
  return { style, scrim: weak / count > SCRIM_SHARE };
}

