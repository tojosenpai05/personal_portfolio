const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.ogg']);

const SKIP_DIRS = new Set(['node_modules', '.git', 'scripts', 'supabase', 'css', 'js']);

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel  = path.relative(ROOT, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(full, results);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)) results.push({ full, rel, ext });
    }
  }
  return results;
}

function upload(filePath, bucket, objectKey) {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    const url = new URL(`${SUPABASE_URL}/storage/v1/object/${bucket}/${objectKey}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': contentType,
        'Content-Length': data.length,
        'x-upsert': 'true',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) resolve(body);
        else reject(new Error(`HTTP ${res.statusCode}: ${body}`));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function replaceInHtmlFiles(mapping) {
  const htmlFiles = [
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'about.html'),
    path.join(ROOT, 'work.html'),
    path.join(ROOT, 'projects', 'aibin.html'),
    path.join(ROOT, 'projects', 'sdas.html'),
    path.join(ROOT, 'projects', 'electrofuel.html'),
    path.join(ROOT, 'projects', 'mediassist.html'),
    path.join(ROOT, 'projects', 'zeta.html'),
  ];
  const jsFiles = [
    path.join(ROOT, 'js', 'hero.js'),
  ];
  const configFile = path.join(ROOT, 'js', 'supabase-config.js');

  const imgBase = `${SUPABASE_URL}/storage/v1/object/public/images`;
  const vidBase = `${SUPABASE_URL}/storage/v1/object/public/videos`;

  for (const file of [...htmlFiles, ...jsFiles]) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const { rel, ext } of mapping) {
      const isVideo = VIDEO_EXTS.has(ext);
      const base = isVideo ? vidBase : imgBase;
      const newUrl = `${base}/${rel}`;
      const patterns = [
        `src="${rel}"`, `src='${rel}'`,
        `src="../${rel}"`, `src='../${rel}'`,
        `\`${rel}\``, `\`../${rel}\``,
      ];
      for (const pat of patterns) {
        if (content.includes(pat)) {
          const replacement = pat.startsWith('`') ? `\`${newUrl}\`` : pat.replace(/(src=["'])([^"']+)(["'])/, `$1${newUrl}$3`);
          content = content.split(pat).join(replacement);
          changed = true;
        }
      }
    }
    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  Updated: ${path.relative(ROOT, file)}`);
    }
  }

  let config = fs.readFileSync(configFile, 'utf8');
  config = config
    .replace(/window\.STORAGE_IMAGES\s*=\s*'[^']*'/, `window.STORAGE_IMAGES = '${imgBase}'`)
    .replace(/window\.STORAGE_VIDEOS\s*=\s*'[^']*'/, `window.STORAGE_VIDEOS = '${vidBase}'`)
    .replace(/window\.SUPABASE_URL\s*=\s*'[^']*'/, `window.SUPABASE_URL = '${SUPABASE_URL}'`);
  fs.writeFileSync(configFile, config, 'utf8');
  console.log('  Updated: js/supabase-config.js storage URLs');
}

async function main() {
  const files = walk(ROOT);
  console.log(`Found ${files.length} assets to upload.\n`);

  const mapping = [];
  let ok = 0, fail = 0;

  for (const { full, rel, ext } of files) {
    const isVideo = VIDEO_EXTS.has(ext);
    const bucket = isVideo ? 'videos' : 'images';
    try {
      await upload(full, bucket, rel);
      console.log(`  [OK] ${bucket}/${rel}`);
      mapping.push({ rel, ext });
      ok++;
    } catch (e) {
      console.error(`  [FAIL] ${rel}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nUploaded ${ok} files, ${fail} failed.`);

  if (ok > 0) {
    console.log('\nUpdating HTML + JS files with storage URLs...');
    await replaceInHtmlFiles(mapping);
    console.log('Done. Review js/supabase-config.js and fill in SUPABASE_ANON if not set.');
  }
}

main().catch(console.error);
