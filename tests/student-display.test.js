const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { getLearningGuide } = require('../learning-guide');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = {};
    this.value = '';
    this.hidden = false;
    this.ownText = '';
  }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.ownText = String(value); this.children = []; }
  get firstElementChild() { return this.children[0] || null; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.ownText = ''; this.children = children; }
  add(child) { this.append(child); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
}

const fixtureStudent = (changes = {}) => ({
  id: 'student-a', alias: '학습자-2F0AB3C0', name: '가상하나', school: '현풍중학교',
  points: 300, level: 5, rank: 1, observedGrowth: 100, modifiedAt: '2026-10-30T06:00:00Z',
  history: [
    { at: '2026-10-29T06:00:00Z', points: 200, level: 4 },
    { at: '2026-10-30T06:00:00Z', points: 300, level: 5 },
  ],
  ...changes,
});
const settled = () => new Promise(resolve => setImmediate(resolve));

function loadClient(script = 'dashboard.js', { staticMode = false, reportFailure = false, collectedAt } = {}) {
  const nodes = new Map();
  const errors = [];
  const requests = [];
  const students = [fixtureStudent(), fixtureStudent({
    id: 'student-b', alias: '학습자-ABC12345', school: '도원중학교', points: 200, rank: 2,
  })];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  node('learning-template').content = { cloneNode: () => new Element() };
  const document = {
    currentScript: { src: 'https://example.test/paco-pythonCoach/' + script }, hidden: false,
    getElementById: node, createElement: tag => new Element(tag),
    createElementNS: (namespace, tag) => new Element(tag), addEventListener() {},
  };
  const responses = {
    '/reports/dashboard.json': {
      mode: 'static', students, schools: students.map(student => student.school),
      collectedAt: collectedAt || new Date().toISOString(), historyNote: '이번 배포의 단일 관측값입니다.',
    },
    '/reports/learning-guides.json': { mode: 'static', guides: { 5: getLearningGuide(5) } },
    '/api/dashboard': {
      students, schools: students.map(student => student.school), collectedAt: students[0].modifiedAt,
    },
    '/api/presence': {
      activeUsers: 1, generatedAt: students[0].modifiedAt, trackingStartedAt: students[0].modifiedAt,
      recentLoginUsers: 2,
      recentLogins: students.map(student => ({ ...student, lastLoginAt: student.modifiedAt, active: true })),
    },
    '/api/me/learning': {
      student: students[0], collectedAt: students[0].modifiedAt,
      ranking: { overall: 1, overallStudents: 2, school: 1, schoolStudents: 1 },
      guide: getLearningGuide(5), historyNote: '서버의 관측 기록입니다.',
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'public', script), 'utf8'), {
    document, URL, Intl, AbortController,
    window: { addEventListener() {}, ...(staticMode ? { PcoDeployment: { mode: 'static' } } : {}) },
    Option: function (text, value) {
      const option = new Element('option');
      option.textContent = text;
      option.value = value;
      return option;
    },
    fetch: async url => {
      requests.push(String(url));
      if (reportFailure) throw new TypeError('Fixture report unavailable');
      const body = responses[url.pathname.replace('/paco-pythonCoach', '')];
      if (!body) throw new Error('Unexpected request: ' + url);
      return { ok: true, json: async () => body };
    },
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() {},
    console: { error(...args) { errors.push(args); } },
  });
  return { node, nodes, students, errors, requests };
}

test('ranking and report retain names but display only school beneath them', async () => {
  const app = loadClient();
  await settled();
  const row = app.node('ranking-body').children[0];
  assert.equal(row.children[1].children[0].textContent, '가상하나');
  assert.equal(row.children[1].children[1].textContent, '현풍중학교');
  assert.equal(row.children[2].textContent, 'Lv.5');
  assert.equal(app.node('report-student').textContent, '가상하나');
  assert.equal(app.node('report-school').textContent, '현풍중학교');
  assert.equal(app.node('report-points').textContent, '300');
  assert.equal(app.node('history-body').children.length, 2);
  assert.equal(app.node('growth-chart').firstElementChild.tagName, 'svg');
});

test('student aliases are absent from dashboard text and accessibility labels', async () => {
  const app = loadClient();
  await settled();
  for (const element of app.nodes.values()) {
    assert.doesNotMatch(element.textContent, /학습자-|2F0AB3C0|ABC12345/);
  }
  for (const row of app.node('ranking-body').children) {
    const label = row.children[1].children[0].attributes['aria-label'];
    assert.doesNotMatch(label, /학습자-|2F0AB3C0|ABC12345/);
    assert.match(label, /학교 성장 리포트 보기/);
  }
  assert.equal(app.node('presence-body').children[0].children[0].textContent, '가상하나');
  assert.equal(app.node('presence-body').children[0].children[1].textContent, '현풍중학교');
});

test('name and school search replace alias search', async () => {
  const app = loadClient();
  await settled();
  const search = app.node('student-search');
  search.value = '가상하나';
  search.listeners.input();
  assert.match(app.node('ranking-count').textContent, /^2명/);
  search.value = '도원';
  search.listeners.input();
  assert.match(app.node('ranking-count').textContent, /^1명/);
  assert.equal(app.node('ranking-body').children[0].children[1].children[1].textContent, '도원중학교');
  search.value = '학습자-2F0AB3C0';
  search.listeners.input();
  assert.equal(app.node('ranking-count').textContent, '0명');
});

test('same-name students remain separately selectable by internal student ID', async () => {
  const app = loadClient();
  await settled();
  const secondButton = app.node('ranking-body').children[1].children[1].children[0];
  secondButton.listeners.click();
  assert.equal(app.node('report-student').textContent, '가상하나');
  assert.equal(app.node('report-school').textContent, '도원중학교');
  assert.equal(app.node('report-points').textContent, '200');
  assert.equal(app.node('ranking-body').children[1].className, 'selected');
});

test('personal learning page displays school only while retaining name, level and points', async () => {
  const app = loadClient('my-learning.js');
  await settled();
  assert.equal(app.node('my-identity').textContent, '현풍중학교');
  assert.equal(app.node('learner-name').textContent, '가상하나님의 학습 현황');
  assert.equal(app.node('my-level').textContent, 'Lv.5');
  assert.equal(app.node('my-points').textContent, '300점');
  assert.equal(app.node('learning-content').hidden, false);
  for (const element of app.nodes.values()) {
    assert.doesNotMatch(element.textContent, /학습자-|2F0AB3C0/);
  }
  assert.equal(app.errors.length, 0);
});

test('static report uses the repository-relative snapshot, hides presence and preserves ranking selection', async () => {
  const app = loadClient('dashboard.js', { staticMode: true });
  await settled();
  assert.deepEqual(app.requests, ['https://example.test/paco-pythonCoach/reports/dashboard.json']);
  assert.equal(app.node('activity-metric').hidden, true);
  assert.equal(app.node('presence-panel').hidden, true);
  assert.equal(app.node('source-status').textContent, '배포 시점 정적 리포트');
  assert.match(app.node('source-hint').textContent, /실시간 데이터 아님/);
  assert.equal(app.node('ranking-body').children.length, 2);
  app.node('ranking-body').children[1].children[1].children[0].listeners.click();
  assert.equal(app.node('report-school').textContent, '도원중학교');
  assert.match(app.node('public-data-note').textContent, /공개 JSON/);
});

test('static report labels old data and never replaces failed data with sample students', async () => {
  const old = loadClient('dashboard.js', { staticMode: true, collectedAt: '2020-01-01T00:00:00Z' });
  await settled();
  assert.match(old.node('source-hint').textContent, /2시간 경과/);
  assert.equal(old.node('source-status').dataset.state, 'error');
  const failed = loadClient('dashboard.js', { staticMode: true, reportFailure: true });
  await settled();
  assert.equal(failed.node('dashboard-error').hidden, false);
  assert.match(failed.node('source-hint').textContent, /실시간 조회 없이/);
  assert.doesNotMatch(failed.node('ranking-body').textContent, /가상하나/);
  assert.ok(failed.requests.every(url => !url.includes('/api/')));
});

test('static personal page lets a student pick their public record and computes ranks without API calls', async () => {
  const app = loadClient('my-learning.js', { staticMode: true });
  await settled();
  assert.deepEqual(app.requests, [
    'https://example.test/paco-pythonCoach/reports/dashboard.json',
    'https://example.test/paco-pythonCoach/reports/learning-guides.json',
  ]);
  assert.equal(app.node('learning-picker').hidden, false);
  assert.equal(app.node('learning-status').textContent, '학생 선택 필요');
  assert.equal(app.node('learning-refresh').disabled, false);
  assert.equal(app.node('static-school').children.length, 3);
  app.node('static-school').value = '현풍중학교';
  app.node('static-school').listeners.change();
  assert.equal(app.node('static-student').children.length, 2);
  app.node('static-student').value = 'student-a';
  app.node('static-student').listeners.change();
  assert.equal(app.node('learner-name').textContent, '가상하나님의 학습 현황');
  assert.equal(app.node('my-points').textContent, '300점');
  assert.equal(app.node('my-rank').textContent, '1위');
  assert.match(app.node('my-rank-note').textContent, /전체 2명 · 학교 1위 \/ 1명/);
  assert.equal(app.node('learning-status').textContent, '공개 정적 리포트 기준');
  assert.ok(app.requests.every(url => !url.includes('/api/')));
});

test('static personal page reports failures instead of showing stale records', async () => {
  const app = loadClient('my-learning.js', { staticMode: true, reportFailure: true });
  await settled();
  assert.equal(app.node('learning-status').textContent, '리포트 조회 실패');
  assert.equal(app.node('learning-error').hidden, false);
  assert.equal(app.node('learning-picker').hidden, true);
});
