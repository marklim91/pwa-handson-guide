/* Browser-only replacement for the Node server's /api/* routes (no Node.js required).
 * 호출 목적지는 아래 DEFAULTS에 직접 적거나 local-setup.html에서 브라우저별로 지정합니다.
 * (브라우저에서 직접 호출하므로 URL은 사용자에게 노출됩니다.) */
(function () {
  "use strict";
  if (window.PcoLocalApi) return;

  // ▼ 여기에 목적지를 적으면 모든 브라우저에서 로컬 정적 모드가 자동으로 켜집니다.
  var DEFAULTS = {
    flowUrl: "https://9324e73acd4ee049b7ba177af6165e.9c.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/00/workflows/851f75900f9a4337846b383582ca17e7/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=bPTH-lcpkubsaezJnG4wTIj4aFAp0XTkpKKruvskdA8",   // 대시보드·내 학습 조회 흐름 (POST → { value: [...] })
    loginUrl: "https://9324e73acd4ee049b7ba177af6165e.9c.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/06/workflows/71a2933bb7e842f2b9652087997dcccd/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rSa7q-NmXW3saTWfBqnP8gVfr221HFmhFRSpZ7U0DHc",  // 로그인 검증 흐름 (POST {school, studentId, studentName} → { verified: true|false }). 비우면 조회 데이터로 검증
    contentType: "json", // 이 흐름들은 application/json 본문만 받습니다(text/plain은 400). "text"는 사전 요청 없는 text/plain
  };

  var script = document.currentScript;
  var base = script && script.src ? new URL(".", script.src) : new URL(".", location.href);
  var originalFetch = window.fetch ? window.fetch.bind(window) : null;
  var CONFIG_KEY = "pco-local-config";
  var STATE_KEY = "pco-local-state";
  var ROWS_KEY = "pco-local-rows";
  var DAY = 86400000;
  var SESSION_MS = 12 * 60 * 60 * 1000;
  var ACTIVE_MS = 5 * 60 * 1000;
  var CACHE_MS = 60000;
  var MAX_ROWS = 100000;
  var MAX_RESPONSE_CHARS = 32 * 1024 * 1024;
  var GUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

  function LocalError(status, code, message) {
    this.status = status;
    this.code = code;
    this.message = message;
  }

  function read(key) {
    try { return JSON.parse(window.localStorage.getItem(key)); } catch (error) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (error) { return false; }
  }

  function config() {
    var value = read(CONFIG_KEY) || {};
    var text = function (stored, fallback) { return typeof stored === "string" && stored ? stored : fallback; };
    return {
      // DEFAULTS에 URL을 적어 두면 별도 설정 없이 자동으로 켜집니다.
      enabled: typeof value.enabled === "boolean" ? value.enabled : Boolean(DEFAULTS.flowUrl || DEFAULTS.loginUrl),
      flowUrl: text(value.flowUrl, DEFAULTS.flowUrl),
      loginUrl: text(value.loginUrl, DEFAULTS.loginUrl),
      contentType: (value.contentType || DEFAULTS.contentType) === "json" ? "json" : "text",
    };
  }
  function isStatic() { return window.PcoDeployment && window.PcoDeployment.mode === "static"; }

  var FLOW_TEXT = {
    dashboard: {
      badUrl: ["INVALID_DASHBOARD_URL", "대시보드 조회 흐름 URL 설정을 확인해 주세요."],
      http: ["DASHBOARD_FLOW_HTTP_ERROR", "Dataverse 조회 흐름 실행에 실패했습니다."],
      large: ["DASHBOARD_RESPONSE_TOO_LARGE", "조회 데이터가 처리 한도를 초과했습니다."],
      timeout: ["DASHBOARD_TIMEOUT", "조회 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."],
      unreachable: ["DASHBOARD_FLOW_UNREACHABLE", "Power Automate 흐름에 연결할 수 없습니다. 브라우저가 응답을 읽으려면 흐름의 Response에 " +
        "Access-Control-Allow-Origin 헤더가 필요합니다. 어려우면 local-setup.html에서 JSON 가져오기를 사용해 주세요."],
    },
    login: {
      badUrl: ["INVALID_FLOW_URL", "학생 검증 흐름 URL 설정을 확인해 주세요."],
      http: ["FLOW_HTTP_ERROR", "학생 정보 확인 서비스에 오류가 발생했습니다. 관리자에게 문의해 주세요."],
      large: ["INVALID_FLOW_RESPONSE", "데이터가 존재하지 않거나 Active한 사용자가 아닙니다."],
      timeout: ["FLOW_TIMEOUT", "학생 정보 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."],
      unreachable: ["FLOW_UNREACHABLE", "학생 검증 흐름에 연결할 수 없습니다. 흐름의 Response에 Access-Control-Allow-Origin 헤더가 있는지, " +
        "text/plain 요청 본문을 json(triggerBody())로 읽는지 확인해 주세요."],
    },
  };

  function flowEndpoint(value, kind) {
    if (!value) {
      throw new LocalError(503, "DASHBOARD_NOT_CONFIGURED",
        "데이터 소스가 설정되지 않았습니다. local-api.js의 DEFAULTS 또는 local-setup.html에서 Power Automate URL을 입력하거나 JSON을 가져와 주세요.");
    }
    var bad = FLOW_TEXT[kind || "dashboard"].badUrl;
    var url;
    try { url = new URL(value); } catch (error) {
      throw new LocalError(503, bad[0], bad[1]);
    }
    if (url.protocol !== "https:" || url.username || url.password || url.hash ||
        !(url.hostname.endsWith(".api.powerplatform.com") || url.hostname.endsWith(".logic.azure.com"))) {
      throw new LocalError(503, bad[0], bad[1]);
    }
    return url.href;
  }

  function invalidResponse() {
    return new LocalError(502, "INVALID_DASHBOARD_RESPONSE",
      "Dataverse 응답 형식이 올바르지 않습니다. 필수 열, 값 형식과 modifiedon을 확인해 주세요.");
  }

  function latestStudents(body) {
    if (!body || !Array.isArray(body.value)) throw invalidResponse();
    if (body["@odata.nextLink"] || body["@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded"] === true ||
        body.value.length >= MAX_ROWS) {
      throw new LocalError(502, "INCOMPLETE_DASHBOARD_DATA",
        "일부 학습 기록만 반환되었습니다. 조회 흐름의 페이지 매김과 전체 행 수를 확인해 주세요.");
    }
    var latest = new Map();
    body.value.forEach(function (row) {
      if (!row || typeof row !== "object" ||
          typeof row.crbf2_schoolname !== "string" || !row.crbf2_schoolname.trim() ||
          row.crbf2_schoolname.length > 120 ||
          typeof row.crbf2_studentnumber !== "string" || !/^[0-9]{1,32}$/.test(row.crbf2_studentnumber) ||
          typeof row.crbf2_studentlearningrecordid !== "string" || !GUID.test(row.crbf2_studentlearningrecordid) ||
          typeof row.crbf2_isactive !== "boolean" ||
          !Number.isSafeInteger(row.crbf2_learningpoints) || row.crbf2_learningpoints < 0 ||
          !Number.isSafeInteger(row.crbf2_currentlevel) || row.crbf2_currentlevel < 0 ||
          typeof row.modifiedon !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.modifiedon) ||
          !Number.isFinite(Date.parse(row.modifiedon))) throw invalidResponse();
      if (typeof row.crbf2_studentname !== "string" || !row.crbf2_studentname.trim() ||
          row.crbf2_studentname.length > 100) {
        throw new LocalError(502, "STUDENT_NAME_REQUIRED",
          "학생 이름이 없습니다. Power Automate 행 나열의 열 선택에 crbf2_studentname을 추가하고 이름 값을 확인해 주세요.");
      }
      var student = {
        school: row.crbf2_schoolname, studentId: row.crbf2_studentnumber, name: row.crbf2_studentname.trim(),
        points: row.crbf2_learningpoints, level: row.crbf2_currentlevel,
        active: row.crbf2_isactive, modifiedAt: row.modifiedon,
      };
      var key = JSON.stringify([student.school, student.studentId]);
      var previous = latest.get(key);
      if (previous && Date.parse(previous.modifiedAt) === Date.parse(student.modifiedAt) &&
          (previous.points !== student.points || previous.level !== student.level ||
            previous.active !== student.active || previous.name !== student.name)) {
        throw new LocalError(502, "AMBIGUOUS_STUDENT_RECORD",
          "동일 학생의 최신 기록을 구분할 수 없습니다. 중복 레코드의 modifiedon과 누적 점수 구조를 확인해 주세요.");
      }
      if (!previous || Date.parse(student.modifiedAt) > Date.parse(previous.modifiedAt)) latest.set(key, student);
    });
    return Array.from(latest.values()).filter(function (s) { return s.active; });
  }

  async function callFlow(rawUrl, payload, kind) {
    var settings = config();
    var text = FLOW_TEXT[kind];
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await originalFetch(flowEndpoint(rawUrl, kind), {
        method: "POST", cache: "no-store", redirect: "error", signal: controller.signal,
        headers: { "Content-Type": settings.contentType === "json" ? "application/json" : "text/plain" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new LocalError(502, text.http[0], text.http[1]);
      var body = await response.text();
      if (body.length > MAX_RESPONSE_CHARS) throw new LocalError(502, text.large[0], text.large[1]);
      try { return JSON.parse(body); } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        throw kind === "login" ? new LocalError(502, text.large[0], text.large[1]) : invalidResponse();
      }
    } catch (error) {
      if (error instanceof LocalError) throw error;
      var failure = error && error.name === "AbortError" ? text.timeout : text.unreachable;
      throw new LocalError(error && error.name === "AbortError" ? 504 : 502, failure[0], failure[1]);
    } finally { clearTimeout(timeout); }
  }

  async function fetchRows() {
    var settings = config();
    if (!settings.flowUrl) {
      var imported = read(ROWS_KEY);
      if (!imported) flowEndpoint("");
      return latestStudents({ value: imported });
    }
    return latestStudents(await callFlow(settings.flowUrl, {}, "dashboard"));
  }

  /* ---------- local state (sessions, logins, observed history) ---------- */
  function randomHex(bytes) {
    var values = new Uint8Array(bytes);
    window.crypto.getRandomValues(values);
    return Array.prototype.map.call(values, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  function readState() {
    var state = read(STATE_KEY);
    if (!state || state.version !== 1 || typeof state.secret !== "string" ||
        !Array.isArray(state.logins) || !Array.isArray(state.snapshots)) {
      state = { version: 1, secret: randomHex(32), startedAt: Date.now(), session: null, logins: [], snapshots: [] };
    }
    var now = Date.now();
    if (state.session && state.session.expiresAt <= now) state.session = null;
    state.logins = state.logins.filter(function (s) { return s.lastLoginAt > now - 30 * DAY; });
    state.snapshots = state.snapshots.filter(function (s) { return s.observedAt > now - 90 * DAY; });
    return state;
  }
  function writeState(state) {
    if (write(STATE_KEY, state)) return;
    var cutoff = Date.now() - 30 * DAY;
    state.snapshots = state.snapshots.filter(function (s) { return s.observedAt > cutoff; });
    if (!write(STATE_KEY, state)) console.error("[local-api] 브라우저 저장 공간이 부족해 상태를 저장하지 못했습니다.");
  }

  async function digest(text) {
    var bytes = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.prototype.map.call(new Uint8Array(bytes), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function studentKey(state, school, studentId) {
    return (await digest(state.secret + JSON.stringify([school, studentId]))).slice(0, 24);
  }
  function publicStudent(key, school, name) {
    return { id: key, alias: "학습자-" + key.slice(0, 8).toUpperCase(), school: school, name: name == null ? null : name };
  }

  async function observe(students) {
    var state = readState();
    var time = Date.now();
    var date = new Date(time).toISOString().slice(0, 10);
    var index = new Map(state.snapshots.map(function (s) { return [s.key + s.date, s]; }));
    for (var i = 0; i < students.length; i++) {
      var student = students[i];
      var key = await studentKey(state, student.school, student.studentId);
      var existing = index.get(key + date);
      if (existing) {
        existing.observedAt = time;
        existing.points = student.points;
        existing.level = student.level;
      } else {
        var created = {
          key: key, date: date, startedAt: time, startPoints: student.points, startLevel: student.level,
          observedAt: time, points: student.points, level: student.level,
        };
        state.snapshots.push(created);
        index.set(key + date, created);
      }
      var login = state.logins.find(function (entry) { return entry.key === key; });
      if (login) login.name = student.name;
    }
    writeState(state);
  }
  function histories(state) {
    var result = new Map();
    state.snapshots.slice().sort(function (a, b) { return a.startedAt - b.startedAt; }).forEach(function (s) {
      if (!result.has(s.key)) result.set(s.key, []);
      var values = result.get(s.key);
      values.push({ at: new Date(s.startedAt).toISOString(), points: s.startPoints, level: s.startLevel });
      if (s.observedAt !== s.startedAt && (s.points !== s.startPoints || s.level !== s.startLevel)) {
        values.push({ at: new Date(s.observedAt).toISOString(), points: s.points, level: s.level });
      }
    });
    return result;
  }

  var cached = null;
  var pending = null;
  async function load(force) {
    if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached;
    if (pending) return pending;
    pending = (async function () {
      var students = await fetchRows();
      await observe(students);
      cached = { at: Date.now(), students: students };
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  }

  async function rankStudents(students, school) {
    var state = readState();
    var all = histories(state);
    var rows = [];
    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      if (school && s.school !== school) continue;
      var id = await studentKey(state, s.school, s.studentId);
      var history = all.get(id) || [];
      rows.push(Object.assign(publicStudent(id, s.school, s.name), {
        points: s.points, level: s.level, modifiedAt: s.modifiedAt, history: history,
        observedGrowth: history.length > 1 ? s.points - history[0].points : null,
      }));
    }
    rows.sort(function (a, b) { return b.points - a.points || a.id.localeCompare(b.id); });
    var rank = 0;
    return rows.map(function (row, i) {
      if (i === 0 || row.points !== rows[i - 1].points) rank = i + 1;
      return Object.assign({}, row, { rank: rank });
    });
  }

  var guideScript = null;
  function learningGuide(level) {
    if (window.PcoLearningGuide) return Promise.resolve(window.PcoLearningGuide.getLearningGuide(level));
    if (!guideScript) {
      guideScript = new Promise(function (resolve, reject) {
        var tag = document.createElement("script");
        tag.src = new URL("learning-guide.js", base).href;
        tag.onload = resolve;
        tag.onerror = function () { reject(new LocalError(500, "GUIDE_UNAVAILABLE", "학습 가이드 파일을 불러올 수 없습니다.")); };
        document.head.appendChild(tag);
      });
    }
    return guideScript.then(function () { return window.PcoLearningGuide.getLearningGuide(level); });
  }

  /* ---------- route handlers ---------- */
  function currentSession(state) {
    return state.session && state.session.expiresAt > Date.now() ? state.session : null;
  }
  function parseBody(init) {
    try { return JSON.parse(init && typeof init.body === "string" ? init.body : ""); } catch (error) { return null; }
  }

  var routes = {
    "login/verify": async function (method, url, init) {
      var failure = function (error) { error.verified = false; return error; };
      if (method !== "POST") throw failure(new LocalError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다."));
      var body = parseBody(init);
      if (!body || typeof body !== "object" || Array.isArray(body) ||
          typeof body.school !== "string" || !body.school || body.school.length > 120 ||
          typeof body.studentId !== "string" || !/^[0-9]{1,32}$/.test(body.studentId) ||
          typeof body.studentName !== "string" || body.studentName.length > 100 ||
          !/^\p{L}[\p{L}\p{M}]*$/u.test(body.studentName)) {
        throw failure(new LocalError(400, "INVALID_STUDENT", "학교, 숫자로 된 학번, 문자로 된 이름을 모두 입력해 주세요."));
      }
      var settings = config();
      var match;
      if (settings.loginUrl) {
        var result;
        try {
          result = await callFlow(settings.loginUrl, {
            school: body.school, studentId: body.studentId, studentName: body.studentName,
          }, "login");
        } catch (error) { throw failure(error); }
        if (!result || typeof result.verified !== "boolean") {
          throw failure(new LocalError(502, "INVALID_FLOW_RESPONSE", "데이터가 존재하지 않거나 Active한 사용자가 아닙니다."));
        }
        if (result.verified) match = { school: body.school, studentId: body.studentId, name: body.studentName };
      } else {
        var data;
        try { data = await load(true); } catch (error) { throw failure(error); }
        match = data.students.find(function (s) {
          return s.school === body.school && s.studentId === body.studentId && s.name === body.studentName.trim();
        });
      }
      if (!match) {
        throw failure(new LocalError(401, "STUDENT_NOT_VERIFIED",
          "입력 정보가 일치하는 활성 학생을 찾을 수 없습니다. 학교, 학번, 이름을 확인해 주세요."));
      }
      var state = readState();
      var key = await studentKey(state, match.school, match.studentId);
      var time = Date.now();
      state.session = { key: key, school: match.school, name: match.name, expiresAt: time + SESSION_MS, lastSeenAt: time };
      var entry = state.logins.find(function (s) { return s.key === key; });
      if (entry) { entry.lastLoginAt = time; entry.name = match.name; } else {
        state.logins.push({ key: key, school: match.school, name: match.name, lastLoginAt: time });
      }
      writeState(state);
      return { verified: true };
    },
    "session": async function (method) {
      if (method !== "GET") throw new LocalError(405, "METHOD_NOT_ALLOWED", "GET 요청만 지원합니다.");
      var session = currentSession(readState());
      return session ? Object.assign({ authenticated: true }, publicStudent(session.key, session.school, session.name),
        { expiresAt: new Date(session.expiresAt).toISOString() }) : { authenticated: false };
    },
    "session/heartbeat": async function (method) {
      if (method !== "POST") throw new LocalError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.");
      var state = readState();
      if (!currentSession(state)) throw new LocalError(401, "SESSION_REQUIRED", "접속 현황에 참여하려면 다시 로그인해 주세요.");
      state.session.lastSeenAt = Date.now();
      writeState(state);
      return { recorded: true };
    },
    "session/logout": async function (method) {
      if (method !== "POST") throw new LocalError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.");
      var state = readState();
      state.session = null;
      writeState(state);
      return { loggedOut: true };
    },
    "presence": async function (method) {
      if (method !== "GET") throw new LocalError(405, "METHOD_NOT_ALLOWED", "GET 요청만 지원합니다.");
      var state = readState();
      var time = Date.now();
      var activeKey = state.session && state.session.lastSeenAt > time - ACTIVE_MS ? state.session.key : null;
      return {
        trackingStartedAt: new Date(state.startedAt).toISOString(),
        generatedAt: new Date(time).toISOString(),
        activeWindowMinutes: ACTIVE_MS / 60000,
        activeUsers: activeKey ? 1 : 0,
        recentLoginUsers: state.logins.length,
        recentLogins: state.logins.slice().sort(function (a, b) { return b.lastLoginAt - a.lastLoginAt; })
          .slice(0, 20).map(function (s) {
            return Object.assign(publicStudent(s.key, s.school, s.name),
              { lastLoginAt: new Date(s.lastLoginAt).toISOString(), active: s.key === activeKey });
          }),
        scope: "이 브라우저 한 곳의 기록입니다. 다른 기기의 접속은 집계되지 않습니다.",
      };
    },
    "dashboard": async function (method, url) {
      if (method !== "GET") throw new LocalError(405, "METHOD_NOT_ALLOWED", "GET 요청만 지원합니다.");
      var school = url.searchParams.get("school") || "";
      if (school.length > 120) throw new LocalError(400, "INVALID_SCHOOL", "학교 선택값이 올바르지 않습니다.");
      var data = await load();
      var schools = Array.from(new Set(data.students.map(function (s) { return s.school; }))).sort();
      if (school && schools.indexOf(school) === -1) throw new LocalError(400, "INVALID_SCHOOL", "조회 결과에 없는 학교입니다.");
      var students = await rankStudents(data.students, school);
      var total = students.reduce(function (sum, s) { return sum + s.points; }, 0);
      if (!Number.isSafeInteger(total)) throw invalidResponse();
      return {
        collectedAt: new Date(data.at).toISOString(), refreshIntervalSeconds: CACHE_MS / 1000,
        schools: schools, selectedSchool: school, students: students,
        summary: {
          students: students.length, totalPoints: total,
          averageLevel: students.length ? students.reduce(function (sum, s) { return sum + s.level; }, 0) / students.length : null,
          growingStudents: students.filter(function (s) { return s.observedGrowth !== null && s.observedGrowth > 0; }).length,
        },
        historyNote: "이 브라우저가 수집한 최근 90일 점수 관측값입니다. Dataverse의 과거 학습 이력을 복원한 값이 아닙니다.",
      };
    },
    "me/learning": async function (method, url) {
      if (method !== "GET") throw new LocalError(405, "METHOD_NOT_ALLOWED", "GET 요청만 지원합니다.");
      var session = currentSession(readState());
      if (!session) throw new LocalError(401, "SESSION_REQUIRED", "내 학습 현황을 보려면 로그인 / 재검증을 진행해 주세요.");
      if (url.search) {
        throw new LocalError(400, "PERSONAL_QUERY_NOT_ALLOWED",
          "내 학습 현황은 로그인 세션으로만 조회합니다. 학생 선택값을 전달하지 마세요.");
      }
      var data = await load();
      var rankings = await rankStudents(data.students, "");
      var student = rankings.find(function (entry) { return entry.id === session.key; });
      if (!student) {
        throw new LocalError(404, "LEARNING_RECORD_NOT_FOUND",
          "현재 로그인 학생의 활성 학습 기록을 찾을 수 없습니다. 학생 정보와 실제 활성 여부를 확인해 주세요.");
      }
      var mates = rankings.filter(function (entry) { return entry.school === student.school; });
      return {
        collectedAt: new Date(data.at).toISOString(), student: student,
        ranking: {
          overall: student.rank, overallStudents: rankings.length,
          school: mates.filter(function (entry) { return entry.points > student.points; }).length + 1,
          schoolStudents: mates.length,
        },
        guide: await learningGuide(student.level),
        historyNote: "이 브라우저가 수집한 최근 90일 점수 관측값입니다. 최초 수집 이전의 성장이나 실제 학습 횟수는 포함하지 않습니다.",
      };
    },
  };

  function respond(status, body) {
    return new Response(JSON.stringify(body), {
      status: status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  function routeFor(input) {
    var url;
    try { url = new URL(typeof input === "string" || input instanceof URL ? String(input) : input.url, location.href); } catch (error) { return null; }
    if (url.origin !== location.origin || url.pathname.indexOf(base.pathname + "api/") !== 0) return null;
    var name = url.pathname.slice((base.pathname + "api/").length);
    return Object.prototype.hasOwnProperty.call(routes, name) ? { name: name, url: url } : null;
  }

  async function handle(input, init) {
    var route = routeFor(input);
    var method = String((init && init.method) || (typeof input === "object" && input.method) || "GET").toUpperCase();
    try {
      return respond(200, await routes[route.name](method, route.url, init));
    } catch (error) {
      if (error instanceof LocalError) {
        var body = { code: error.code, message: error.message };
        if (error.verified === false) body.verified = false;
        return respond(error.status, body);
      }
      console.error("[local-api]", error && error.message);
      return respond(500, { code: "LOCAL_API_FAILED", message: "로컬 API 처리 중 오류가 발생했습니다." });
    }
  }

  function install() {
    if (!originalFetch) return;
    window.fetch = function (input, init) {
      return routeFor(input) ? handle(input, init) : originalFetch(input, init);
    };
  }

  window.PcoLocalApi = {
    config: config,
    saveConfig: function (next) {
      var value = { enabled: next.enabled === true, flowUrl: String(next.flowUrl || "").trim(),
        loginUrl: String(next.loginUrl || "").trim(), contentType: next.contentType === "json" ? "json" : "text" };
      if (value.flowUrl) flowEndpoint(value.flowUrl, "dashboard");
      if (value.loginUrl) flowEndpoint(value.loginUrl, "login");
      if (!write(CONFIG_KEY, value)) throw new Error("브라우저 저장소에 설정을 저장할 수 없습니다.");
      cached = null;
    },
    importRows: function (text) {
      var parsed = JSON.parse(text);
      var rows = Array.isArray(parsed) ? parsed : parsed && parsed.value;
      var students = latestStudents({ value: rows });
      if (!write(ROWS_KEY, rows)) throw new Error("브라우저 저장 공간이 부족합니다. 파일이 너무 큽니다.");
      cached = null;
      return students.length;
    },
    hasImportedRows: function () { return Array.isArray(read(ROWS_KEY)); },
    test: async function () { return (await load(true)).students.length; },
    clearAll: function () {
      [CONFIG_KEY, STATE_KEY, ROWS_KEY].forEach(function (key) { try { window.localStorage.removeItem(key); } catch (error) { /* ignore */ } });
      cached = null;
    },
  };

  if (!isStatic() && config().enabled) install();
})();
