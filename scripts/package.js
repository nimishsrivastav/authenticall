import { createWriteStream } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { createGzip } from 'zlib';
import archiver from 'archiver';

const OUTPUT_DIR = 'extension/dist';
const OUTPUT_FILE = 'authenticall.zip';

async function packageExtension() {
  console.log('📦 Packaging Authenticall extension...\n');

  // Create output stream
  const output = createWriteStream(OUTPUT_FILE);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });

  // Handle events
  output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`✅ Extension packaged successfully!`);
    console.log(`📊 Total size: ${sizeInMB} MB`);
    console.log(`📁 Output: ${OUTPUT_FILE}\n`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('⚠️  Warning:', err.message);
    } else {
      throw err;
    }
  });

  // Pipe archive to output file
  archive.pipe(output);

  // Add files from dist directory
  console.log('📂 Adding files to archive...');
  archive.directory(OUTPUT_DIR, false);

  // Finalize the archive
  await archive.finalize();
}

// Run packaging
packageExtension().catch((error) => {
  console.error('❌ Packaging failed:', error);
  process.exit(1);
});
