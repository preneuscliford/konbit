import { decode as decodeBase64 } from "base64-arraybuffer";
import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { analyzePixels, decodePng, type CoverTone } from "./pngTone";

// Choisit la couleur des icônes de la barre d'état au-dessus d'une photo de
// couverture, à partir des pixels réellement situés sous la barre.
//
// 1. On reproduit le recadrage "cover" de l'écran pour isoler la bande de
//    l'image qui passe sous la barre d'état.
// 2. On la réduit (~48 px de large) et on lit ses pixels (PNG décodé ici).
// 3. Luminance relative WCAG de chaque pixel (espace linéaire), moyenne, puis
//    on garde les icônes (blanches ou noires) qui ont le meilleur contraste.
// 4. Si l'image est très contrastée sous la barre, un voile léger est conseillé.

export type { CoverTone };

// Largeur de l'échantillon analysé : assez pour voir les contrastes, assez petit pour être instantané.
const SAMPLE_WIDTH = 48;

export async function coverToneForStatusBar(
  imageUrl: string,
  layout: { width: number; coverHeight: number; statusBarHeight: number },
): Promise<CoverTone> {
  // Téléchargé une fois dans le cache de l'app (nom dérivé de l'URL).
  const name = `cover-tone-${imageUrl.replace(/[^A-Za-z0-9]/g, "").slice(-60)}.jpg`;
  const target = new File(Paths.cache, name);
  const file = target.exists ? target : await File.downloadFileAsync(imageUrl, target, { idempotent: true });

  const image = await ImageManipulator.manipulate(file.uri).renderAsync();
  const { width: iw, height: ih } = image;

  // Même calcul que contentFit="cover" : l'image remplit la zone, centrée.
  const scale = Math.max(layout.width / iw, layout.coverHeight / ih);
  const originX = Math.max(0, (iw * scale - layout.width) / 2 / scale);
  const originY = Math.max(0, (ih * scale - layout.coverHeight) / 2 / scale);
  const cropWidth = Math.min(iw - originX, layout.width / scale);
  const cropHeight = Math.max(1, Math.min(ih - originY, layout.statusBarHeight / scale));

  const sampleHeight = Math.max(2, Math.round((SAMPLE_WIDTH * cropHeight) / cropWidth));
  const sample = await ImageManipulator.manipulate(image)
    .crop({ originX, originY, width: cropWidth, height: cropHeight })
    .resize({ width: SAMPLE_WIDTH, height: sampleHeight })
    .renderAsync();
  const saved = await sample.saveAsync({ format: SaveFormat.PNG, base64: true });
  if (!saved.base64) throw new Error("no_pixels");

  const png = decodePng(new Uint8Array(decodeBase64(saved.base64)));
  return analyzePixels(png.pixels, png.channels);
}
