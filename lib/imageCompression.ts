import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// Images de konbit légères pour les mauvaises connexions : 1280 px maximum
// sur le plus grand côté, JPEG. Le serveur refuse au-delà de 1 Mo ; on vise
// bien en dessous et on recompresse plus fort si besoin.
const MAX_SIDE = 1280;
const TARGET_BYTES = 700 * 1024;
const QUALITIES = [0.7, 0.5, 0.35];

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

export async function compressImage(
  uri: string,
  width: number,
  height: number,
  maxSide = MAX_SIDE,
): Promise<CompressedImage> {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const context = ImageManipulator.manipulate(uri);
  if (scale < 1) {
    context.resize(width >= height ? { width: Math.round(width * scale) } : { height: Math.round(height * scale) });
  }
  const image = await context.renderAsync();

  let result = await image.saveAsync({ compress: QUALITIES[0], format: SaveFormat.JPEG });
  for (const quality of QUALITIES.slice(1)) {
    const size = await fetch(result.uri)
      .then((r) => r.blob())
      .then((b) => b.size)
      .catch(() => 0);
    if (size <= TARGET_BYTES) break;
    result = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
  }
  return { uri: result.uri, width: result.width, height: result.height };
}
