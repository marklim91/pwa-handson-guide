const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fetchDashboardStudents } = require('../dashboard-api');
const { getLearningGuide } = require('../learning-guide');

function learningGuides(students) {
  const guides = {};
  for (const level of new Set(students.map(student => student.level))) guides[level] = getLearningGuide(level);
  return { mode: 'static', guides };
}

function publicSnapshot(students, collectedAt) {
  if (!Number.isSafeInteger(students.reduce((sum, student) => sum + student.points, 0))) {
    throw new Error('PAGES_POINT_TOTAL_OUT_OF_RANGE');
  }
  const sorted = students.map(student => ({
    id: crypto.randomUUID(),
    name: student.name, school: student.school, points: student.points, level: student.level,
    modifiedAt: student.modifiedAt,
    history: [{ at: collectedAt, points: student.points, level: student.level }],
    observedGrowth: null,
  })).sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  let rank = 0;
  const ranked = sorted.map((student, index) => {
    if (!index || student.points !== sorted[index - 1].points) rank = index + 1;
    return { ...student, rank };
  });
  return {
    mode: 'static', collectedAt,
    schools: [...new Set(ranked.map(student => student.school))].sort(),
    students: ranked,
    historyNote: '이번 배포에서 수집한 단일 관측값입니다. 이전 배포의 과거 성장과 로그인 기록은 포함하지 않습니다.',
  };
}

function collectAssets(directory, relative = '') {
  const assets = [];
  for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error('PAGES_SYMLINK_NOT_ALLOWED');
    if (entry.isDirectory()) assets.push(...collectAssets(directory, name));
    else if (/\.(html|css|js|svg|png|ico|webmanifest)$/i.test(entry.name) || entry.name === 'manifest.json') {
      assets.push(name);
    }
  }
  return assets;
}

async function buildPages({
  outputDir = path.join(__dirname, '..', '_site'),
  sourceDir = path.join(__dirname, '..', 'public'),
  flowUrl = process.env.POWER_AUTOMATE_DASHBOARD_URL,
  publishStudentData = process.env.PAGES_PUBLISH_STUDENT_DATA === 'true',
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) {
  if (!publishStudentData) throw new Error('PAGES_PUBLICATION_CONSENT_REQUIRED');
  if (fs.existsSync(outputDir)) throw new Error('PAGES_OUTPUT_ALREADY_EXISTS');
  const assets = collectAssets(sourceDir);
  const students = await fetchDashboardStudents({ flowUrl, fetchImpl });
  const snapshot = publicSnapshot(students, new Date(now()).toISOString());
  fs.mkdirSync(outputDir, { recursive: true });
  for (const asset of assets) {
    const destination = path.join(outputDir, asset);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (path.extname(asset) === '.html') {
      let html = fs.readFileSync(path.join(sourceDir, asset), 'utf8');
      const scriptPath = path.relative(path.dirname(asset), 'site-mode.js').split(path.sep).join('/');
      if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('PAGES_HTML_HEAD_REQUIRED');
      html = html.replace(/<head(?:\s[^>]*)?>/i, head =>
        head + '\n    <script src="' + scriptPath + '"></script>');
      fs.writeFileSync(destination, html);
    } else if (asset === 'sw.js') {
      const worker = fs.readFileSync(path.join(sourceDir, asset), 'utf8')
        .replace(/(const CACHE_NAME = ')([^']+)(';)/, '$1$2-pages$3')
        .replace('const ASSETS = [', "const ASSETS = [\n  './site-mode.js',");
      fs.writeFileSync(destination, worker);
    } else fs.copyFileSync(path.join(sourceDir, asset), destination);
  }
  fs.writeFileSync(path.join(outputDir, 'site-mode.js'),
    'window.PcoDeployment = Object.freeze({ mode: "static" });\n');
  fs.mkdirSync(path.join(outputDir, 'reports'));
  fs.writeFileSync(path.join(outputDir, 'reports', 'dashboard.json'), JSON.stringify(snapshot));
    fs.writeFileSync(path.join(outputDir, 'reports', 'learning-guides.json'),
      JSON.stringify(learningGuides(snapshot.students)));  fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');
  return { students: snapshot.students.length, collectedAt: snapshot.collectedAt };
}

if (require.main === module) {
  buildPages().then(result => {
    console.log(`Pages export complete: ${result.students} students, ${result.collectedAt}`);
  }).catch(error => {
    console.error('[build-pages]', error.code || (
      /^PAGES_[A-Z_]+$/.test(error.message) ? error.message : 'PAGES_EXPORT_FAILED'));
    process.exitCode = 1;
  });
}

module.exports = { buildPages, publicSnapshot };
