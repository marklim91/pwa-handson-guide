const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = name => fs.readFileSync(path.join(__dirname, '..', 'public', name), 'utf8');

test('static home bypasses editable-cookie login without claiming authentication', () => {
  const redirects = [];
  const window = { PcoDeployment: { mode: 'static' } };
  vm.runInNewContext(source('auth.js'), {
    URL, window,
    document: {
      currentScript: { src: 'https://example.test/paco/auth.js', dataset: {} },
      get cookie() { throw new Error('Static home must not inspect identity cookies.'); },
    },
    location: { replace(url) { redirects.push(url); } },
  });
  assert.deepEqual(redirects, []);
  assert.equal(window.PcoAuth, undefined);
});

test('static login routes to the public report and never submits a verification request', () => {
  const redirects = [];
  const window = { PcoDeployment: { mode: 'static' } };
  vm.runInNewContext(source('auth.js'), {
    URL, window,
    document: { currentScript: { src: 'https://example.test/paco/auth.js', dataset: { page: 'login' } } },
    location: { replace(url) { redirects.push(url); } },
  });
  vm.runInNewContext(source('login.js'), { window });
  assert.deepEqual(redirects, ['https://example.test/paco/dashboard.html']);
});

test('static presence explicitly disables session checks and login controls', () => {
  const nodes = {
    'pco-session-status': {}, 'pco-session-login': { hidden: false }, 'pco-session-logout': { hidden: false },
  };
  vm.runInNewContext(source('presence.js'), {
    URL, window: { PcoDeployment: { mode: 'static' } },
    document: {
      currentScript: { src: 'https://example.test/paco/presence.js' },
      getElementById(id) { return nodes[id]; },
    },
    fetch() { throw new Error('No API may be called in static mode.'); },
  });
  assert.equal(nodes['pco-session-status'].textContent, '공개 정적 리포트 · 로그인 미지원');
  assert.equal(nodes['pco-session-login'].hidden, true);
  assert.equal(nodes['pco-session-logout'].hidden, true);
});

test('static shell retains repository-relative navigation without a presence script', () => {
  const nodes = {
    'pco-session-status': {}, 'pco-session-login': { hidden: false }, 'pco-session-logout': { hidden: false },
  };
  const inserted = [];
  vm.runInNewContext(source('app-shell.js'), {
    URL, navigator: {},
    window: {
      PcoDeployment: { mode: 'static' },
      location: { pathname: '/paco-pythonCoach/dashboard.html' },
    },
    document: {
      currentScript: { src: 'https://example.test/paco-pythonCoach/app-shell.js' },
      getElementById(id) { return nodes[id]; },
      createElement(tag) {
        assert.equal(tag, 'div');
        return { innerHTML: '' };
      },
      body: { firstChild: null, insertBefore(element) { inserted.push(element); } },
      head: { appendChild() { throw new Error('Presence script must not be loaded.'); } },
    },
  });
  assert.equal(inserted.length, 1);
  assert.match(inserted[0].innerHTML, /href="\/paco-pythonCoach\/dashboard.html"/);
  assert.match(inserted[0].innerHTML, /href="\/paco-pythonCoach\/my-learning.html"/);
  assert.equal(nodes['pco-session-status'].textContent, '공개 정적 리포트 · 로그인 미지원');
  assert.equal(nodes['pco-session-login'].hidden, true);
});
