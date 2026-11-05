// Synthetic workbooks only: no client files or business data are needed by this suite.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Excel = require('exceljs');
const { zipSync, strToU8 } = require('fflate');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const modules = {};
function load(file) {
  if (modules[file]) return modules[file];
  const mod = { exports: {} };
  const requireModule = id => id === 'server-only' ? {} : id.startsWith('@/') ? load(id.slice(2) + '.ts') : require(id);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext('(function(require,module,exports){' + code + '})', { Date, Buffer, console, process, crypto: require('node:crypto'), Uint8Array, Set, TextDecoder })(requireModule, mod, mod.exports);
  return modules[file] = mod.exports;
}
const { parseEditorialWorkbook } = load('lib/editorial-parser.ts');
async function parse(workbook) { return parseEditorialWorkbook(new Uint8Array(await workbook.xlsx.writeBuffer()), 'demo.xlsx'); }
(async () => {
  const workbook = new Excel.Workbook();
  const sheet = workbook.addWorksheet('Piano');
  sheet.addRow(['Plan demo']); sheet.mergeCells('A1:D1');
  sheet.addRow(['Post', 'Argomento', 'Immagine consigliata', 'Zone']);
  sheet.getCell('A3').value = 1; sheet.mergeCells('A3:A5');
  sheet.getCell('B3').value = { richText: [{ text: 'Un nuovo ' }, { text: 'progetto' }] };
  sheet.getCell('B4').value = 'Testo aggiunto dal cliente.';
  sheet.getCell('C3').value = 'Settimana del 16 novembre'; sheet.mergeCells('C3:C5');
  sheet.getCell('D3').value = 'Umbria';
  sheet.getCell('A6').value = 2; sheet.mergeCells('A6:A8'); // A blank position must not create a post.
  const weeks = workbook.addWorksheet('Settimane');
  weeks.addRow(['Settimana', 'POST 1', 'POST 2', 'STORIA']);
  weeks.addRow(['1a settimana marzo', 'Primo contenuto', 'Secondo contenuto', 'Un sondaggio']);
  weeks.mergeCells('A2:A4'); weeks.mergeCells('B2:B4'); weeks.mergeCells('C2:C4'); weeks.mergeCells('D2:D4');
  const result = await parse(workbook);
  assert.deepEqual(Array.from(result.sheets, s => s.rows.length), [1, 3]);
  const post = result.sheets[0].rows[0];
  assert.equal(post.data.copy, 'Un nuovo progetto\n\nTesto aggiunto dal cliente.');
  assert.equal(post.data.date, ''); assert.equal(post.data.status, 'Idea');
  assert.ok(post.data.notes.includes('Zone: Umbria')); assert.ok(post.data.notes.includes('16 novembre'));
  assert.equal(result.sheets[1].rows.filter(r => r.data.format === 'Storia').length, 1);
  assert.ok(result.sheets[1].rows.every(r => r.data.date === ''));
  assert.equal(new Set(result.sheets.flatMap(s => s.rows.map(r => r.sourceKey))).size, 4);
  sheet.getCell('B3').value = 'Testo restituito dal cliente';
  assert.equal((await parse(workbook)).sheets[0].rows[0].sourceKey, post.sourceKey);
  for (const date1904 of [false, true]) {
    const dated = new Excel.Workbook(); dated.properties.date1904 = date1904;
    const ws = dated.addWorksheet('Date'); ws.addRow(['Post', 'Argomento', 'Immagine']);
    ws.addRow([new Date('2026-04-17T00:00:00Z'), 'Contenuto con data', { text: 'Materiali', hyperlink: 'https://example.com/assets' }]);
    ws.getCell('A2').numFmt = 'dd/mm/yyyy';
    const p = (await parse(dated)).sheets[0].rows[0]; assert.equal(p.data.date, '2026-04-17'); assert.ok(p.data.notes.includes('https://example.com/assets'));
  }
  const duplicate = new Excel.Workbook(); const dup = duplicate.addWorksheet('Doppioni');
  dup.addRow(['Post', 'Argomento']); dup.addRow([1, 'Primo']); dup.addRow([1, 'Secondo']);
  await assert.rejects(() => parse(duplicate), /duplicati/);
  const formulas = new Excel.Workbook(); const form = formulas.addWorksheet('Formule');
  form.addRow(['Post', 'Argomento']); form.addRow([1, { formula: '1+1' }]);
  assert.ok((await parse(formulas)).sheets[0].warnings.some(w => w.includes('non esegue formule')));
  await assert.rejects(() => parseEditorialWorkbook(new Uint8Array([1, 2]), 'bad.xlsx'));
  await assert.rejects(() => parseEditorialWorkbook(new Uint8Array(4 * 1024 * 1024 + 1), 'large.xlsx'));
  await assert.rejects(() => parseEditorialWorkbook(new Uint8Array([1]), 'legacy.xls'));
  const excessiveRange = zipSync({ 'xl/worksheets/sheet1.xml': strToU8('<worksheet><mergeCell ref="A1:XFD1048576"/></worksheet>') });
  await assert.rejects(() => parseEditorialWorkbook(excessiveRange, 'range.xlsx'), /area del foglio/);
  console.log('Editorial import regression checks passed: merged blocks, continuation text, empty positions, weekly matrix, stable identities, 1900/1904 dates, links, formulas and file limits.');
})().catch(error => { console.error(error); process.exitCode = 1; });
