const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'new.html'), 'utf8');
const script = id => html.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))[1];
const curriculum = JSON.parse(script('curriculum'));
const context = vm.createContext({
  document: { getElementById: () => ({ textContent: script('curriculum') }) },
  URL,
});
vm.runInContext(script('studio-core'), context);
const evaluate = expression => vm.runInContext(expression, context);

test('standalone studio module and Python worker have valid JavaScript syntax', () => {
  const moduleSource = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  for (const source of [moduleSource, script('worker-source')]) {
    const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: source, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});

test('sample curriculum supplies unique problems, runnable references and judging data', () => {
  assert.equal(curriculum.length, 3);
  const problems = curriculum.flatMap(track => track.problems);
  assert.equal(problems.length, 9);
  assert.equal(new Set(problems.map(problem => problem.id)).size, problems.length);
  for (const problem of problems) {
    for (const key of ['id', 'title', 'topic', 'concept', 'starter', 'solution', 'input', 'output']) {
      assert.equal(typeof problem[key], 'string', `${problem.id}: ${key}`);
      assert.ok(problem[key].length, `${problem.id}: empty ${key}`);
    }
    assert.ok(problem.tests.length > 0);
    assert.ok(problem.hints.length > 0);
    assert.ok(problem.constraints.length > 0);
    for (const sample of problem.tests) {
      assert.equal(typeof sample.input, 'string');
      assert.equal(typeof sample.output, 'string');
    }
  }
});

test('output comparison ignores only line endings and trailing whitespace', () => {
  assert.equal(evaluate('normalizeOutput("hello  \\r\\nworld\\n\\n")'), 'hello\nworld');
  assert.equal(evaluate('normalizeOutput(" Hello, Python!\\n")'), ' Hello, Python!');
  assert.notEqual(evaluate('normalizeOutput("hello")'), evaluate('normalizeOutput("Hello")'));
  assert.notEqual(evaluate('normalizeOutput("a  b")'), evaluate('normalizeOutput("a b")'));
  assert.equal(evaluate('normalizeOutput("")'), '');
});

test('fresh storage starts at entry problem with no fake progress', () => {
  const result = evaluate('readStudioState({ getItem() { return null; } })');
  assert.equal(result.state.selected, 'hello');
  assert.equal(result.state.completed.length, 0);
  assert.equal(Object.keys(result.state.codes).length, 0);
  assert.equal(result.warning, '');
});

test('saved drafts, selected problem, coach URL and completed problems restore', () => {
  context.saved = JSON.stringify({
    selected: 'pair', codes: { pair: 'print("YES")' }, completed: ['hello', 'sum', 'hello'],
    coachUrl: 'https://example.com/coach',
  });
  const result = evaluate('readStudioState({ getItem() { return saved; } })');
  assert.equal(result.state.selected, 'pair');
  assert.equal(result.state.codes.pair, 'print("YES")');
  assert.equal(result.state.completed.join(','), 'hello,sum');
  assert.equal(result.state.coachUrl, 'https://example.com/coach');
  assert.equal(result.warning, '');
});

test('invalid saved records warn explicitly without writing over the original', () => {
  const invalidRecords = [
    '{invalid', 'null', '[]',
    JSON.stringify({ selected: 'missing', codes: {}, completed: [], coachUrl: 'https://example.com' }),
    JSON.stringify({ selected: 'hello', codes: { hello: 42 }, completed: [], coachUrl: 'https://example.com' }),
    JSON.stringify({ selected: 'hello', codes: {}, completed: ['missing'], coachUrl: 'https://example.com' }),
    JSON.stringify({ selected: 'hello', codes: {}, completed: [], coachUrl: 'javascript:alert(1)' }),
  ];
  for (const record of invalidRecords) {
    context.saved = record;
    const result = evaluate('readStudioState({ getItem() { return saved; }, setItem() { throw new Error("Must not overwrite"); } })');
    assert.ok(result.warning);
    assert.equal(result.state.selected, 'hello');
    assert.equal(result.state.completed.length, 0);
  }
  assert.match(evaluate('readStudioState({ getItem() { throw new Error("Denied"); } }).warning'), /Denied/);
});

test('coach configuration rejects insecure schemes and embedded credentials', () => {
  for (const url of ['http://example.com', 'javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com', 'not a URL']) {
    context.url = url;
    assert.throws(() => evaluate('validateCoachUrl(url)'));
  }
  assert.equal(evaluate('validateCoachUrl("  https://example.com/chat  ")'), 'https://example.com/chat');
});

test('new page stays independent from legacy authentication and API scripts', () => {
  assert.doesNotMatch(html, /src=["'][^"']*(?:auth|presence|app-shell)\.js/);
  assert.doesNotMatch(html, /fetch\s*\(|\/api\//);
  assert.match(html, /new Worker\(workerUrl, \{ type: 'module' \}\)/);
  assert.match(html, /worker\.terminate\(\)/);
});
