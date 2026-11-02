const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const rawSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'local-api.js'), 'utf8');
const defaultsBlock = /var DEFAULTS = \{[\s\S]*?\n  \};/;
const source = rawSource.replace(defaultsBlock, 'var DEFAULTS = { flowUrl: "", loginUrl: "", contentType: "text" };');
const flowUrl = 'https://example.environment.api.powerplatform.com/test?sig=private-local-value';
const row = (changes = {}) => ({
  crbf2_studentlearningrecordid: '11111111-1111-4111-8111-111111111111',
  crbf2_schoolname: '가상학교', crbf2_studentnumber: '00123', crbf2_studentname: '가상하나',
  crbf2_learningpoints: 300, crbf2_currentlevel: 5, crbf2_isactive: true,
  modifiedon: '2026-10-30T05:00:00Z', ...changes,
});
const rows = [
  row(),
  row({ crbf2_studentlearningrecordid: '22222222-2222-4222-8222-222222222222', crbf2_studentnumber: '00456', crbf2_studentname: '가상둘', crbf2_learningpoints: 500 }),
  row({ crbf2_studentlearningrecordid: '33333333-3333-4333-8333-333333333333', crbf2_studentnumber: '00789', crbf2_studentname: '가상셋', crbf2_isactive: false }),
];

function createEnvironment({ enabled = true, config, upstream, mode, code = source } = {}) {
  const store = new Map();
  if (config || enabled) store.set('pco-local-config', JSON.stringify({ enabled, ...config }));
  if (enabled === 'unset') store.clear();
  const calls = [];
  const window = {
    localStorage: {
      getItem: key => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key),
    },
    crypto: webcrypto,
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      if (!upstream) throw new Error('Unexpected network call: ' + url);
      return upstream(url, init);
    },
    PcoLearningGuide: require('../learning-guide'),
    ...(mode ? { PcoDeployment: { mode } } : {}),
  };
  vm.runInNewContext(code, {
    window, Response, URL, TextEncoder, AbortController, Uint8Array, console,
    setTimeout, clearTimeout,
    location: { href: 'http://127.0.0.1:8080/dashboard.html', origin: 'http://127.0.0.1:8080' },
    document: { currentScript: { src: 'http://127.0.0.1:8080/local-api.js' } },
  });
  const call = async (route, init) => {
    const response = await window.fetch('http://127.0.0.1:8080/api/' + route, init);
    return { status: response.status, body: await response.json() };
  };
  return { window, store, calls, call };
}
const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const imported = () => {
  const env = createEnvironment();
  env.window.PcoLocalApi.importRows(JSON.stringify({ value: rows }));
  return env;
};

test('local API stays inert unless enabled and never intercepts in Pages static mode', async () => {
  for (const options of [{ enabled: false }, { mode: 'static' }]) {
    const env = createEnvironment(options);
    await assert.rejects(env.window.fetch('http://127.0.0.1:8080/api/session'), /Unexpected network call/);
  }
});

test('dashboard ranks only active latest students from imported JSON and records no network calls', async () => {
  const env = imported();
  const { status, body } = await env.call('dashboard');
  assert.equal(status, 200);
  assert.deepEqual(body.students.map(s => [s.name, s.rank]), [['가상둘', 1], ['가상하나', 2]]);
  assert.deepEqual(body.schools, ['가상학교']);
  assert.equal(body.summary.totalPoints, 800);
  assert.equal(env.calls.length, 0);
  assert.doesNotMatch(JSON.stringify(body), /00123|00456|11111111-1111/);
  assert.equal((await env.call('dashboard?school=없는학교')).status, 400);
});

test('login verifies against active rows, creates a session and serves personal learning data', async () => {
  const env = imported();
  assert.deepEqual((await env.call('session')).body, { authenticated: false });
  assert.equal((await env.call('me/learning')).status, 401);
  const rejected = await env.call('login/verify', post({ school: '가상학교', studentId: '00789', studentName: '가상셋' }));
  assert.equal(rejected.status, 401);
  assert.equal(rejected.body.verified, false);
  assert.equal((await env.call('login/verify', post({ school: '가상학교', studentId: '00123', studentName: '다른이름' }))).status, 401);
  assert.equal((await env.call('login/verify', post({ school: '가상학교', studentId: 'abc', studentName: '가상하나' }))).status, 400);
  const ok = await env.call('login/verify', post({ school: '가상학교', studentId: '00123', studentName: '가상하나' }));
  assert.deepEqual(ok.body, { verified: true });
  const session = (await env.call('session')).body;
  assert.equal(session.authenticated, true);
  assert.equal(session.name, '가상하나');
  const mine = (await env.call('me/learning')).body;
  assert.equal(mine.student.name, '가상하나');
  assert.deepEqual(mine.ranking, { overall: 2, overallStudents: 2, school: 2, schoolStudents: 2 });
  assert.equal(mine.guide.current.level, 5);
  assert.equal((await env.call('me/learning?student=x')).status, 400);
  assert.equal((await env.call('session/heartbeat', { method: 'POST' })).status, 200);
  const presence = (await env.call('presence')).body;
  assert.equal(presence.activeUsers, 1);
  assert.equal(presence.recentLogins[0].name, '가상하나');
  assert.equal((await env.call('session/logout', { method: 'POST' })).status, 200);
  assert.equal((await env.call('session/heartbeat', { method: 'POST' })).status, 401);
  assert.deepEqual((await env.call('session')).body, { authenticated: false });
});

test('observed history accumulates in the browser and growth appears after points change', async () => {
  const env = imported();
  await env.call('dashboard');
  const state = JSON.parse(env.store.get('pco-local-state'));
  state.snapshots.forEach(s => { s.startedAt -= 86400000; s.observedAt -= 86400000; s.date = '2000-01-01'; });
  env.store.set('pco-local-state', JSON.stringify(state));
  env.window.PcoLocalApi.importRows(JSON.stringify(rows.map(r => ({ ...r, crbf2_learningpoints: r.crbf2_learningpoints + 50 }))));
  const { body } = await env.call('dashboard');
  assert.deepEqual(body.students.map(s => s.observedGrowth), [50, 50]);
  assert.equal(body.summary.growingStudents, 2);
});

test('flow mode posts a CORS-simple request and validates the response without leaking the URL', async () => {
  const env = createEnvironment({
    config: { flowUrl },
    upstream: async () => Response.json({ value: rows }),
  });
  const { status, body } = await env.call('dashboard');
  assert.equal(status, 200);
  assert.equal(body.students.length, 2);
  assert.equal(env.calls.length, 1);
  assert.equal(env.calls[0].url, flowUrl);
  assert.equal(env.calls[0].init.method, 'POST');
  assert.equal(env.calls[0].init.redirect, 'error');
  assert.equal(env.calls[0].init.headers['Content-Type'], 'text/plain');
  assert.doesNotMatch(JSON.stringify(body), /private-local-value/);
});

test('login flow URL receives the student fields and its verified result decides the session', async () => {
  const loginUrl = 'https://example.environment.api.powerplatform.com/login?sig=private-login-value';
  const seen = [];
  const env = createEnvironment({
    config: { flowUrl, loginUrl },
    upstream: async (url, init) => {
      seen.push({ url: String(url), init });
      if (String(url) === loginUrl) return Response.json({ verified: JSON.parse(init.body).studentId === '00123' });
      return Response.json({ value: rows });
    },
  });
  const student = { school: '가상학교', studentId: '00123', studentName: '가상하나' };
  assert.deepEqual((await env.call('login/verify', post(student))).body, { verified: true });
  const login = seen.find(call => call.url === loginUrl);
  assert.equal(login.init.method, 'POST');
  assert.deepEqual(JSON.parse(login.init.body), student);
  assert.equal(login.init.headers['Content-Type'], 'text/plain');
  assert.equal((await env.call('session')).body.authenticated, true);
  assert.equal(seen.filter(call => call.url === flowUrl).length, 0);
  const rejected = await env.call('login/verify', post({ ...student, studentId: '00456' }));
  assert.equal(rejected.status, 401);
  assert.equal(rejected.body.verified, false);

  const broken = createEnvironment({ config: { loginUrl }, upstream: async () => Response.json({ ok: 1 }) });
  const invalid = await broken.call('login/verify', post(student));
  assert.equal(invalid.status, 502);
  assert.equal(invalid.body.verified, false);
  const blocked = createEnvironment({ config: { loginUrl }, upstream: async () => { throw new TypeError('Failed to fetch'); } });
  assert.equal((await blocked.call('login/verify', post(student))).body.code, 'FLOW_UNREACHABLE');
});

test('shipped DEFAULTS enable local mode without setup and call both flows with JSON bodies', async () => {
  const defaults = /flowUrl: "([^"]+)"[\s\S]*?loginUrl: "([^"]+)"[\s\S]*?contentType: "(\w+)"/.exec(rawSource);
  assert.ok(defaults, 'DEFAULTS must define flowUrl, loginUrl and contentType');
  const [, dashboardUrl, loginUrl, contentType] = defaults;
  assert.equal(contentType, 'json');
  const urls = [];
  const env = createEnvironment({
    enabled: 'unset', code: rawSource,
    upstream: async (url, init) => {
      urls.push({ url: String(url), type: init.headers['Content-Type'] });
      return String(url) === new URL(loginUrl).href ? Response.json({ verified: true }) : Response.json({ value: rows });
    },
  });
  assert.equal(env.store.size, 0);
  assert.equal((await env.call('dashboard')).status, 200);
  assert.equal((await env.call('login/verify', post({ school: '가상학교', studentId: '00123', studentName: '가상하나' }))).status, 200);
  assert.deepEqual(urls, [
    { url: new URL(dashboardUrl).href, type: 'application/json' },
    { url: new URL(loginUrl).href, type: 'application/json' },
  ]);
});

test('missing source, blocked flow, bad rows and unsafe URLs fail explicitly', async () => {
  const empty = createEnvironment();
  const missing = await empty.call('dashboard');
  assert.equal(missing.status, 503);
  assert.match(missing.body.message, /local-setup\.html/);

  const blocked = createEnvironment({ config: { flowUrl }, upstream: async () => { throw new TypeError('Failed to fetch'); } });
  const unreachable = await blocked.call('dashboard');
  assert.equal(unreachable.status, 502);
  assert.equal(unreachable.body.code, 'DASHBOARD_FLOW_UNREACHABLE');
  assert.doesNotMatch(JSON.stringify(unreachable.body), /private-local-value/);

  const http = createEnvironment({ config: { flowUrl: 'https://example.org/x' } });
  assert.equal((await http.call('dashboard')).body.code, 'INVALID_DASHBOARD_URL');
  assert.throws(() => http.window.PcoLocalApi.saveConfig({ flowUrl: 'http://x.logic.azure.com/a' }));

  const partial = createEnvironment({ config: { flowUrl }, upstream: async () => Response.json({ value: rows, '@odata.nextLink': 'next' }) });
  assert.equal((await partial.call('dashboard')).body.code, 'INCOMPLETE_DASHBOARD_DATA');
  const nameless = createEnvironment({ config: { flowUrl }, upstream: async () => Response.json({ value: [row({ crbf2_studentname: null })] }) });
  assert.equal((await nameless.call('dashboard')).body.code, 'STUDENT_NAME_REQUIRED');
  const failed = createEnvironment({ config: { flowUrl }, upstream: async () => new Response('x', { status: 503 }) });
  assert.equal((await failed.call('dashboard')).body.code, 'DASHBOARD_FLOW_HTTP_ERROR');
});

test('non-API requests pass through untouched and clearAll removes every stored value', async () => {
  const env = createEnvironment({ upstream: async () => new Response('ok') });
  assert.equal(await (await env.window.fetch('http://127.0.0.1:8080/reports/dashboard.json')).text(), 'ok');
  assert.equal((await env.window.fetch('http://127.0.0.1:8080/api/unknown')).status, 200);
  env.window.PcoLocalApi.importRows(JSON.stringify(rows));
  await env.call('dashboard');
  env.window.PcoLocalApi.clearAll();
  assert.equal(env.store.size, 0);
});
