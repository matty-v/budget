import sharp from 'sharp';
import { readFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, 'icon.svg');
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generateIcons() {
  for (const { name, size } of sizes) {
    const outputPath = name === 'apple-touch-icon.png'
      ? join(publicDir, name)
      : join(iconsDir, name);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated ${name} (${size}x${size})`);
  }

  // Copy SVG to icons folder
  copyFileSync(svgPath, join(iconsDir, 'icon.svg'));
  console.log('Copied icon.svg');

  // Generate maskable icon (with padding for safe zone)
  const maskableSize = 512;
  const padding = Math.floor(maskableSize * 0.1); // 10% padding
  const innerSize = maskableSize - (padding * 2);

  await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 15, g: 15, b: 26, alpha: 1 } // Match dark background
    })
    .png()
    .toFile(join(iconsDir, 'icon-maskable.png'));

  console.log('Generated icon-maskable.png (512x512 with safe zone)');
}

generateIcons().catch(console.error);
