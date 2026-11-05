import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const legacyPhotos = Array.from({ length: 28 }, (_, index) => `galleryimages/gallery_${index + 1}.jpg`);
const fieldPhotoNames = (await readdir("images/enhanced-new"))
    .filter((name) => /\.jpe?g$/i.test(name))
    .sort((first, second) => first.localeCompare(second));
const fieldPhotos = fieldPhotoNames.map((name) => `images/enhanced-new/${name}`);

for (const source of [...legacyPhotos, ...fieldPhotos]) {
    const isLegacyPhoto = source.startsWith("galleryimages/");
    const outputDirectory = isLegacyPhoto ? "galleryimages/thumbnails" : "images/gallery-thumbnails";
    const outputPrefix = path.join(outputDirectory, path.basename(source, path.extname(source)));
    await mkdir(outputDirectory, { recursive: true });

    for (const width of [360, 720]) {
        const height = Math.round(width * 9 / 16);
        const resized = sharp(source)
            .rotate()
            .resize({ width, height, fit: "cover", position: "attention", withoutEnlargement: true });
        await Promise.all([
            resized.clone().jpeg({ quality: 76, mozjpeg: true }).toFile(`${outputPrefix}-${width}.jpg`),
            resized.clone().webp({ quality: 70, effort: 5 }).toFile(`${outputPrefix}-${width}.webp`),
        ]);
    }
}

console.log(`Generated responsive thumbnails for ${legacyPhotos.length + fieldPhotos.length} gallery photos.`);