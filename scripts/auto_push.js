const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
let debounceTimer = null;
let isPushing = false;
let hasPendingChanges = false;

function doAutoPush() {
  if (isPushing) {
    hasPendingChanges = true;
    return;
  }
  isPushing = true;
  hasPendingChanges = false;

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const commitMsg = `auto-update: ${timestamp}`;

  console.log(`[Auto-Push] Staging, committing & pushing to GitHub...`);

  const cmd = process.platform === 'win32'
    ? `git add . ; git commit -m "${commitMsg}" ; git push origin main`
    : `git add . && git commit -m "${commitMsg}" && git push origin main`;

  exec(cmd, { cwd: ROOT_DIR }, (err, stdout, stderr) => {
    isPushing = false;
    const output = (stdout + '\n' + stderr).trim();
    if (output.includes('nothing to commit')) {
      console.log('[Auto-Push] Clean working tree — nothing to commit.');
    } else if (err) {
      console.error(`[Auto-Push] Command output:\n${output}`);
    } else {
      console.log(`[Auto-Push] ✅ Successfully committed and pushed to origin/main: ${commitMsg}`);
    }

    if (hasPendingChanges) {
      debounceTimer = setTimeout(doAutoPush, 4000);
    }
  });
}

function triggerWatch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doAutoPush, 3000);
}

console.log('🚀 Auto-Git Push watcher initialised for shopiversa_revamped repository.');
console.log('👀 Monitoring frontend/src and marketplace/app for code updates...');

const watchDirs = [
  path.join(ROOT_DIR, 'frontend', 'src'),
  path.join(ROOT_DIR, 'marketplace', 'app'),
];

watchDirs.forEach((dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      if (filename.includes('.git') || filename.includes('node_modules') || filename.includes('uploads')) return;
      triggerWatch();
    });
  }
});
