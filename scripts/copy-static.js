import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = 'extension/dist';
const publicDir = 'extension/public';
const extensionRoot = 'extension';

console.log('📋 Copying static files to dist...\n');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json
try {
  copyFileSync(
    join(extensionRoot, 'manifest.json'),
    join(distDir, 'manifest.json')
  );
  console.log('✅ Copied manifest.json');
} catch (error) {
  console.error('❌ Failed to copy manifest.json:', error);
  process.exit(1);
}

// Copy icons directory
const iconsDistDir = join(distDir, 'icons');
if (!existsSync(iconsDistDir)) {
  mkdirSync(iconsDistDir, { recursive: true });
}

try {
  const iconsDir = join(publicDir, 'icons');
  
  // Copy SVG icon (will be converted to PNG in Phase 9)
  if (existsSync(join(iconsDir, 'icon.svg'))) {
    copyFileSync(
      join(iconsDir, 'icon.svg'),
      join(iconsDistDir, 'icon.svg')
    );
    console.log('✅ Copied icon.svg');
  }
  
  // Note about PNG icons
  console.log('ℹ️  PNG icons (16x16, 48x48, 128x128) will be generated in Phase 9');
} catch (error) {
  console.error('❌ Failed to copy icons:', error);
  process.exit(1);
}

console.log('\n✅ Static files copied successfully!');