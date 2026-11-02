const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { buildPages, publicSnapshot } = require('../scripts/build-pages');
const { checkPages } = require('../scripts/check-pages');

const flowUrl = 'https://test.environment.api.powerplatform.com/invoke?sig=private-pages-fixture';
const at = '2026-10-30T06:00:00.000Z';
const row = (changes = {}) => ({
  crbf2_studentlearningrecordid: '11111111-1111-4111-8111-111111111111',
  crbf2_schoolname: '가상학교', crbf2_studentnumber: '00123', crbf2_studentname: '가상하나',
  crbf2_learningpoints: 300, crbf2_currentlevel: 5, crbf2_isactive: true,
  modifiedon: '2026-10-30T05:00:00Z',
  ...changes,
});

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'paco-pages-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function files(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? files(directory, path.join(relative, entry.name)) :
      [path.join(relative, entry.name)]);
}

function options(t, extra = {}) {
  return {
    outputDir: path.join(temporary(t), 'site'), flowUrl, publishStudentData: true,
    fetchImpl: async () => Response.json({ value: [row()] }),
    now: () => Date.parse(at), ...extra,
  };
}

test('Pages export publishes only allowlisted student fields and no signed URL, raw IDs or server state', async t => {
  const opts = options(t);
  const calls = [];
  opts.fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ value: [
      row({ crbf2_email: 'private-email@example.invalid', unexpected_secret: 'private-row-secret' }),
      row({ crbf2_studentnumber: '00456', crbf2_studentname: '가상둘', crbf2_learningpoints: 500 }),
      row({ crbf2_studentnumber: '00789', crbf2_studentname: '가상셋', crbf2_learningpoints: 500 }),
    ] });
  };
  const result = await buildPages(opts);
  assert.deepEqual(result, { students: 3, collectedAt: at });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, flowUrl);
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.body, '{}');
  const output = files(opts.outputDir);
  assert.ok(output.includes('dashboard.html'));
  assert.ok(output.includes(path.join('reports', 'dashboard.json')));
  for (const excluded of ['server.js', 'dashboard-store.js', 'dashboard-api.js', 'login-api.js', '.env']) {
    assert.ok(!output.includes(excluded));
  }
  const report = JSON.parse(fs.readFileSync(path.join(opts.outputDir, 'reports', 'dashboard.json'), 'utf8'));
  assert.equal(report.mode, 'static');
  assert.equal(report.collectedAt, at);
  assert.deepEqual(report.students.map(student => student.rank), [1, 1, 3]);
  assert.deepEqual(Object.keys(report.students[0]).sort(), [
    'id', 'name', 'school', 'points', 'level', 'modifiedAt', 'history', 'observedGrowth', 'rank',
  ].sort());
  for (const student of report.students) {
    assert.equal(student.observedGrowth, null);
    assert.deepEqual(student.history, [{ at, points: student.points, level: student.level }]);
  }
  for (const asset of output.filter(asset => /\.(html|js|json|css)$/.test(asset))) {
    const text = fs.readFileSync(path.join(opts.outputDir, asset), 'utf8');
    for (const secret of [flowUrl, 'private-pages-fixture', 'private-row-secret', 'private-email@example.invalid',
      '11111111-1111-4111-8111-111111111111']) {
      assert.equal(text.includes(secret), false, asset);
    }
  }
  const serialized = JSON.stringify(report);
  const guides = JSON.parse(fs.readFileSync(path.join(opts.outputDir, 'reports', 'learning-guides.json'), 'utf8'));
  assert.equal(guides.mode, 'static');
  assert.deepEqual(Object.keys(guides.guides), ['5']);
  assert.equal(guides.guides[5].current.level, 5);
  for (const privateField of ['studentId', 'recordId', 'alias', 'sessions', 'logins', 'secret', '"00123"', '"00456"', '"00789"']) {
    assert.equal(serialized.includes(privateField), false);
  }
});

test('every generated HTML loads mode before auth/scripts, including nested repository paths', async t => {
  const opts = options(t);
  await buildPages(opts);
  for (const asset of files(opts.outputDir).filter(asset => asset.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(opts.outputDir, asset), 'utf8');
    const first = /<script[^>]+src="([^"]+)"/i.exec(html);
    assert.ok(first, asset);
    const resolved = path.resolve(path.dirname(path.join(opts.outputDir, asset)), first[1]);
    assert.equal(resolved, path.join(opts.outputDir, 'site-mode.js'), asset);
  }
  const mode = {};
  vm.runInNewContext(fs.readFileSync(path.join(opts.outputDir, 'site-mode.js'), 'utf8'), { window: mode });
  assert.equal(mode.PcoDeployment.mode, 'static');
  assert.equal(Object.isFrozen(mode.PcoDeployment), true);
  assert.equal(fs.readFileSync(path.join(opts.outputDir, '.nojekyll'), 'utf8'), '');
});

test('export requires explicit publication consent before fetching or writing any data', async t => {
  let called = false;
  const opts = options(t, { publishStudentData: false, fetchImpl: async () => { called = true; } });
  await assert.rejects(buildPages(opts), /PAGES_PUBLICATION_CONSENT_REQUIRED/);
  assert.equal(called, false);
  assert.equal(fs.existsSync(opts.outputDir), false);
});

test('source errors, missing config, malformed or partial data fail the export without a success artifact', async t => {
  const cases = [
    { flowUrl: '' },
    { fetchImpl: async () => new Response('unavailable', { status: 503 }) },
    { fetchImpl: async () => Response.json({ value: [row()], '@odata.nextLink': 'private-next-link' }) },
    { fetchImpl: async () => Response.json({ value: [row({ crbf2_studentname: null })] }) },
    { fetchImpl: async () => Response.json({ body: { value: [row()] } }) },
  ];
  for (const extra of cases) {
    const opts = options(t, extra);
    await assert.rejects(buildPages(opts));
    assert.equal(fs.existsSync(opts.outputDir), false);
  }
});

test('latest inactive student is excluded and a genuinely empty source exports an empty report', async t => {
  const opts = options(t, {
    fetchImpl: async () => Response.json({ value: [
      row(),
      row({ crbf2_isactive: false, modifiedon: at }),
    ] }),
  });
  await buildPages(opts);
  const report = JSON.parse(fs.readFileSync(path.join(opts.outputDir, 'reports', 'dashboard.json')));
  assert.deepEqual(report.students, []);
  assert.deepEqual(report.schools, []);
});

test('export never reuses or deletes an existing output directory', async t => {
  const opts = options(t);
  fs.mkdirSync(opts.outputDir);
  const marker = path.join(opts.outputDir, 'keep.txt');
  fs.writeFileSync(marker, 'keep');
  await assert.rejects(buildPages(opts), /PAGES_OUTPUT_ALREADY_EXISTS/);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'keep');
});

test('export omits arbitrary JSON, environment files and raw state from the asset source', async t => {
  const opts = options(t);
  const source = path.join(temporary(t), 'public');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'index.html'), '<html><head></head><body></body></html>');
  fs.writeFileSync(path.join(source, '.env'), 'private');
  fs.writeFileSync(path.join(source, 'raw.json'), '{"secret":"private"}');
  opts.sourceDir = source;
  await buildPages(opts);
  assert.equal(fs.existsSync(path.join(opts.outputDir, '.env')), false);
  assert.equal(fs.existsSync(path.join(opts.outputDir, 'raw.json')), false);
});

test('public snapshot IDs do not expose source identities or carry cross-deployment history', () => {
  const students = [{
    school: '가상학교', studentId: '00123', name: '가상하나', points: 10, level: 2,
    recordId: 'private-record', modifiedAt: at,
  }];
  const first = publicSnapshot(students, at);
  const next = publicSnapshot(students, at);
  assert.notEqual(first.students[0].id, next.students[0].id);
  assert.equal(first.students[0].observedGrowth, null);
  assert.throws(() => publicSnapshot([{ ...students[0], points: Number.MAX_SAFE_INTEGER }, students[0]], at),
    /PAGES_POINT_TOTAL_OUT_OF_RANGE/);
});

test('export CLI logs error codes without logging secrets or source response data', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'build-pages.js')], {
    encoding: 'utf8',
    env: { ...process.env, POWER_AUTOMATE_DASHBOARD_URL: 'https://untrusted.invalid/?sig=private-cli-secret',
      PAGES_PUBLISH_STUDENT_DATA: 'true' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /INVALID_DASHBOARD_URL/);
  assert.doesNotMatch(result.stdout + result.stderr, /private-cli-secret|untrusted\.invalid/);
});

test('published Pages check validates actual HTML, static mode and the exact deployed snapshot', async () => {
  const urls = [];
  await checkPages({
    url: 'https://example.test/paco-pythonCoach/', expectedCollectedAt: at,
    fetchImpl: async url => {
      urls.push(String(url));
      if (url.pathname.endsWith('dashboard.html')) return new Response('<script src="site-mode.js"></script><script src="dashboard.js"></script>');
      if (url.pathname.endsWith('site-mode.js')) return new Response('window.PcoDeployment = { mode: "static" };');
      return Response.json({ mode: 'static', students: [], schools: [], collectedAt: at });
    },
  });
  assert.deepEqual(urls, [
    'https://example.test/paco-pythonCoach/dashboard.html',
    'https://example.test/paco-pythonCoach/site-mode.js',
    'https://example.test/paco-pythonCoach/reports/dashboard.json',
  ]);
  await assert.rejects(checkPages({
    url: 'https://example.test/paco-pythonCoach/', expectedCollectedAt: at,
    fetchImpl: async url => url.pathname.endsWith('dashboard.html') ?
      new Response('site-mode.js dashboard.js') : url.pathname.endsWith('site-mode.js') ?
        new Response('mode: "static"') :
        Response.json({ mode: 'static', students: [], schools: [], collectedAt: '2020-01-01' }),
  }), /PAGES_SNAPSHOT_NOT_CURRENT/);
});

test('generated worker precaches static mode but never intercepts APIs or public snapshots', async t => {
  const opts = options(t);
  await buildPages(opts);
  const callbacks = {};
  const precached = [];
  let cacheName;
  const worker = fs.readFileSync(path.join(opts.outputDir, 'sw.js'), 'utf8');
  vm.runInNewContext(worker, {
    URL,
    self: {
      location: { origin: 'https://example.test', href: 'https://example.test/paco/sw.js' },
      addEventListener(name, callback) { callbacks[name] = callback; }, skipWaiting() {},
    },
    caches: { open: async name => {
      cacheName = name;
      return { addAll: async assets => precached.push(...assets) };
    } },
  });
  let install;
  callbacks.install({ waitUntil(promise) { install = promise; } });
  await install;
  assert.match(cacheName, /-pages$/);
  assert.ok(precached.includes('./site-mode.js'));
  assert.ok(!precached.includes('./reports/dashboard.json'));
  for (const file of ['reports/dashboard.json', 'api/session']) {
    let intercepted = false;
    callbacks.fetch({
      request: { method: 'GET', url: 'https://example.test/paco/' + file },
      respondWith() { intercepted = true; },
    });
    assert.equal(intercepted, false);
  }
});
