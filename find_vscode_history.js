const fs = require('fs');
const path = require('path');

const historyDir = 'C:\\Users\\vijay\\AppData\\Roaming\\Cursor\\User\\History';

if (!fs.existsSync(historyDir)) {
  console.log("History directory does not exist");
  process.exit(0);
}

const subdirs = fs.readdirSync(historyDir);
let foundEntries = [];

for (const subdir of subdirs) {
  const subdirPath = path.join(historyDir, subdir);
  if (fs.statSync(subdirPath).isDirectory()) {
    const entriesPath = path.join(subdirPath, 'entries.json');
    if (fs.existsSync(entriesPath)) {
      try {
        const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
        if (entries.resource && entries.resource.toLowerCase().includes('admindashboard.jsx')) {
          console.log("Found entries.json in:", subdirPath);
          console.log("Resource:", entries.resource);
          if (entries.entries) {
            for (const entry of entries.entries) {
              const entryFilePath = path.join(subdirPath, entry.id);
              if (fs.existsSync(entryFilePath)) {
                const stat = fs.statSync(entryFilePath);
                foundEntries.push({
                  path: entryFilePath,
                  time: stat.mtimeMs,
                  size: stat.size,
                  date: stat.mtime
                });
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
}

// Sort entries by modification time descending
foundEntries.sort((a, b) => b.time - a.time);

console.log(`Found ${foundEntries.length} history versions of AdminDashboard.jsx:`);
foundEntries.forEach((e, idx) => {
  console.log(`[${idx}] Path: ${e.path} | Date: ${e.date} | Size: ${e.size} bytes`);
});

if (foundEntries.length > 0) {
  // Let's copy the latest one before our overwrite (which happened at around 03:26 AM / 21:56 Z today, i.e. 2026-07-06)
  // Let's find one that has a size around 73-75 KB (the original size was 73594 bytes)
  const target = foundEntries.find(e => e.size > 70000);
  if (target) {
    console.log("Restoring from:", target.path);
    fs.copyFileSync(target.path, 'restored_AdminDashboard.jsx');
    console.log("Successfully wrote restored_AdminDashboard.jsx");
  } else {
    console.log("Could not find a version larger than 70KB, latest available is:", foundEntries[0].path);
    fs.copyFileSync(foundEntries[0].path, 'restored_AdminDashboard.jsx');
  }
}
