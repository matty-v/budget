import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, 'icon.svg');
const outputPath = join(__dirname, '..', 'public', 'app-icon.png');

const svgBuffer = readFileSync(svgPath);

sharp(svgBuffer)
  .resize(1024, 1024)
  .png()
  .toFile(outputPath)
  .then(info => {
    console.log('Icon generated successfully!');
    console.log(`Size: ${info.width}x${info.height}`);
    console.log(`File size: ${(info.size / 1024).toFixed(2)} KB`);
    console.log(`Output: ${outputPath}`);
  })
  .catch(err => {
    console.error('Error generating icon:', err);
  });
