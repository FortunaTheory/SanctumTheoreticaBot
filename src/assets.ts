import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { basename, resolve } from "node:path";

const decalWidth = 1280;
const decalHeight = 720;

export async function normalizeDecal(folder: string, imageName: string): Promise<Buffer | undefined> {
  if (folder && basename(folder) !== folder) {
    throw new Error(`Ungültiger Decal-Ordnername: ${folder}`);
  }
  const isBucketAsset = /^(oracle|fragment|profile)\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(imageName);
  if (!isBucketAsset && basename(imageName) !== imageName) {
    throw new Error(`Ungültiger Decal-Dateiname: ${imageName}`);
  }

  try {
    const source = isBucketAsset
      ? await loadBucketAsset(imageName)
      : resolve(process.cwd(), "decals", folder, imageName);
    return await sharp(source)
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

function requiredBucketEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} ist für hochgeladene Bilder nicht konfiguriert.`);
  }
  return value;
}

async function loadBucketAsset(key: string): Promise<Buffer> {
  const client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION ?? "auto",
    endpoint: requiredBucketEnv("AWS_ENDPOINT_URL"),
    forcePathStyle: process.env.AWS_S3_URL_STYLE === "path",
    credentials: {
      accessKeyId: requiredBucketEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requiredBucketEnv("AWS_SECRET_ACCESS_KEY")
    }
  });
  const result = await client.send(new GetObjectCommand({
    Bucket: requiredBucketEnv("AWS_S3_BUCKET_NAME"),
    Key: key
  }));
  if (!result.Body) throw new Error("Bucket-Bild enthält keinen lesbaren Inhalt.");
  return Buffer.from(await result.Body.transformToByteArray());
}
