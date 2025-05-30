// This script helps save the Kpege logo as a favicon
// You'll need to have the image saved first, then run this script

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if ImageMagick is installed
function checkImageMagick() {
  try {
    execSync('convert -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Path to source image and destination favicon
const sourceImagePath = path.join(__dirname, 'kpege-logo.png'); // Assumes you saved the image as kpege-logo.png
const faviconPath = path.join(__dirname, 'public', 'favicon.ico');

// Function to convert image using ImageMagick
function convertWithImageMagick() {
  try {
    console.log('Converting image to favicon using ImageMagick...');
    const { spawnSync } = require('child_process');
    const result = spawnSync('convert', [
      sourceImagePath,
      '-define', 'icon:auto-resize=64,48,32,16',
      faviconPath
    ], { stdio: 'inherit' });
    
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`ImageMagick convert failed with exit code ${result.status}`);
    }
    console.log('✅ Favicon created successfully at:', faviconPath);
  } catch (error) {
    console.error('❌ Error converting image:', error.message);
  }
}

// Main function
function main() {
  console.log('Kpege Favicon Converter');
  console.log('======================');
  
  // Validate source image format
  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];
  const sourceExt = path.extname(sourceImagePath).toLowerCase();
  if (!validExtensions.includes(sourceExt)) {
    console.error(`❌ Invalid image format. Supported formats: ${validExtensions.join(', ')}`);
    return;
  }
  
  // Ensure public directory exists
  const publicDir = path.dirname(faviconPath);
  if (!fs.existsSync(publicDir)) {
    console.log(`📁 Creating public directory: ${publicDir}`);
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
   // Check if source image exists
   if (!fs.existsSync(sourceImagePath)) {
    console.error(`❌ Source image not found at: ${sourceImagePath}`);
    console.log('\nPlease save the Kpege logo image as "kpege-logo.png" in the project root directory.');
    console.log('You can download it from the chat or use an image editor to save it.');
    return;
  }
  
  // Check if ImageMagick is installed
  const hasImageMagick = checkImageMagick();
  
  if (hasImageMagick) {
    convertWithImageMagick();
  } else {
    console.log('❌ ImageMagick is not installed. You have these options:');
    console.log('');
    console.log('1. Install ImageMagick and run this script again');
    console.log('   - Mac: brew install imagemagick');
    console.log('   - Windows: https://imagemagick.org/script/download.php');
    console.log('   - Linux: sudo apt-get install imagemagick');
    console.log('');
    console.log('2. Use an online favicon generator:');
    console.log('   - https://favicon.io/favicon-converter/');
    console.log('   - https://realfavicongenerator.net/');
    console.log('');
    console.log('3. Manually create the favicon using an image editor like GIMP or Photoshop');
    console.log('');
    console.log('After creating the favicon, save it to:', faviconPath);
  }
}

// Run the script
main(); 