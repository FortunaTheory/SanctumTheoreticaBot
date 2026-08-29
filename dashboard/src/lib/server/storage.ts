import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const maxImageBytes = 5 * 1024 * 1024;
const maxPixels = 40_000_000;
const formats = {
	jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
	png: { extension: 'png', contentType: 'image/png' },
	webp: { extension: 'webp', contentType: 'image/webp' }
} as const;

export type AssetKind = 'oracle' | 'fragment' | 'profile' | 'whisper';

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required for image uploads.`);
	return value;
}

function getStorageClient(): S3Client {
	return new S3Client({
		region: process.env.AWS_DEFAULT_REGION ?? 'auto',
		endpoint: requiredEnv('AWS_ENDPOINT_URL'),
		forcePathStyle: process.env.AWS_S3_URL_STYLE === 'path',
		credentials: {
			accessKeyId: requiredEnv('AWS_ACCESS_KEY_ID'),
			secretAccessKey: requiredEnv('AWS_SECRET_ACCESS_KEY')
		}
	});
}

export async function uploadImage(file: File, kind: AssetKind): Promise<string> {
	if (file.size === 0) throw new Error('Die Bilddatei ist leer.');
	if (file.size > maxImageBytes) throw new Error('Bilder dürfen höchstens 5 MB groß sein.');

	const body = Buffer.from(await file.arrayBuffer());
	const metadata = await sharp(body, { limitInputPixels: maxPixels }).metadata();
	const format = metadata.format && formats[metadata.format as keyof typeof formats];
	if (!format || !metadata.width || !metadata.height) {
		throw new Error('Erlaubt sind nur gültige JPG-, PNG- oder WebP-Bilder.');
	}

	const key = `${kind}/${randomUUID()}.${format.extension}`;
	await getStorageClient().send(new PutObjectCommand({
		Bucket: requiredEnv('AWS_S3_BUCKET_NAME'),
		Key: key,
		Body: body,
		ContentType: format.contentType,
		CacheControl: 'public, max-age=31536000, immutable'
	}));
	return key;
}