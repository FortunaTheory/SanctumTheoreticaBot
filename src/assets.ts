import sharp from "sharp";
import { basename, resolve } from "node:path";

const decalWidth = 1280;
const decalHeight = 720;

export async function normalizeDecal(folder: string, imageName: string): Promise<Buffer | undefined> {
  if (folder && basename(folder) !== folder) {
    throw new Error(`Ungültiger Decal-Ordnername: ${folder}`);
  }
  if (basename(imageName) !== imageName) {
    throw new Error(`Ungültiger Decal-Dateiname: ${imageName}`);
  }

  const imagePath = resolve(process.cwd(), "decals", folder, imageName);
  try {
    return await sharp(imagePath)
      .resize(decalWidth, decalHeight, {
        fit: "contain",
        background: { r: 7, g: 5, b: 12, alpha: 1 }
      })
      .png()
      .toBuffer();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
