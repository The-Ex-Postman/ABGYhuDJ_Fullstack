
// save as patch-postman-urls.js then: node patch-postman-urls.js input.json output.json
const fs = require('fs');

function normalizeItem(it) {
  if (!it) return;
  if (Array.isArray(it.item)) {
    it.item.forEach(normalizeItem);
  } else if (it.request && it.request.url) {
    const u = it.request.url;
    // Prefer existing raw
    if (typeof u === 'string') {
      it.request.url = { raw: u };
      return;
    }
    if (u.raw) {
      it.request.url = { raw: u.raw };
      return;
    }
    // Rebuild from protocol/host/path/query if needed
    let raw = '';
    const proto = (u.protocol ? u.protocol + '://' : '');
    const host = Array.isArray(u.host) ? u.host.join('.') : (u.host || '');
    const path = Array.isArray(u.path) ? '/' + u.path.join('/') : (u.path ? '/' + u.path : '');
    raw = (proto || '').concat(host || '').concat(path || '');
    if (!raw && u.variable && u.variable.length) {
      // fallback: try {{var}} if any
      raw = '{{' + u.variable[0].key + '}}';
    }
    if (!raw) raw = '{{baseUrl}}'; // ultimate fallback
    it.request.url = { raw };
  }
}

function main() {
  const [, , inFile, outFile] = process.argv;
  if (!inFile || !outFile) {
    console.error('Usage: node patch-postman-urls.js input.json output.json');
    process.exit(2);
  }
  const col = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  if (Array.isArray(col.item)) col.item.forEach(normalizeItem);
  fs.writeFileSync(outFile, JSON.stringify(col, null, 2));
  console.log('Wrote', outFile);
}

main();
