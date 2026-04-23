import pngToIco from 'png-to-ico';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePng = path.join(__dirname, '..', '..', 'manusimicon.png');
const targetDir = path.join(__dirname, '..', 'src-tauri', 'icons');
const tempPng = path.join(__dirname, 'temp-icon.png');

const sizes = [32, 128, 256];

async function generateIcon() {
  try {
    console.log('Reading source image...');
    const image = sharp(sourcePng);
    const metadata = await image.metadata();
    
    console.log(`Source image: ${metadata.width}x${metadata.height}`);
    
    const size = Math.min(metadata.width, metadata.height);
    const left = Math.floor((metadata.width - size) / 2);
    const top = Math.floor((metadata.height - size) / 2);
    
    console.log(`Cropping to square: ${size}x${size}`);
    
    const croppedImage = sharp(sourcePng)
      .extract({ left, top, width: size, height: size });
    
    await croppedImage.clone()
      .resize(256, 256)
      .png()
      .toFile(tempPng);
    
    console.log('Generating ICO with sizes: 16, 32, 48, 64, 128, 256');
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const buffer = await pngToIco(tempPng, { sizes: icoSizes });
    const icoPath = path.join(targetDir, 'icon.ico');
    fs.writeFileSync(icoPath, buffer);
    console.log(`Generated: ${icoPath}`);
    
    console.log('Generating PNG files...');
    for (const pngSize of sizes) {
      const pngPath = path.join(targetDir, `${pngSize}x${pngSize}.png`);
      await croppedImage.clone()
        .resize(pngSize, pngSize)
        .png()
        .toFile(pngPath);
      console.log(`Generated: ${pngPath}`);
    }
    
    fs.unlinkSync(tempPng);
    
    console.log('\nAll icons generated successfully!');
    console.log('\nUpdate tauri.conf.json icon array to:');
    console.log('"icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.ico"]');
  } catch (error) {
    console.error('Error generating icon:', error);
    if (fs.existsSync(tempPng)) {
      fs.unlinkSync(tempPng);
    }
    process.exit(1);
  }
}

generateIcon();
