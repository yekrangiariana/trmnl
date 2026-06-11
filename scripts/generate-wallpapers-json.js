const fs = require('fs');
const path = require('path');

const wallpapersDir = path.join(__dirname, '../wallpapers');
const outputFile = path.join(__dirname, '../wallpapers.json');

try {
  if (!fs.existsSync(wallpapersDir)) {
    console.error(`Error: Wallpapers directory not found at ${wallpapersDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(wallpapersDir);
  const imageFiles = files.filter(file => {
    return /\.(png|jpe?g|webp|gif)$/i.test(file);
  });

  // Sort files numerically/alphabetically for a clean grid
  imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  fs.writeFileSync(outputFile, JSON.stringify(imageFiles, null, 2), 'utf8');
  console.log(`✓ Generated wallpapers.json with ${imageFiles.length} files.`);
} catch (err) {
  console.error('Failed to generate wallpapers index:', err);
  process.exit(1);
}
