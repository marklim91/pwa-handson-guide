(function () {
  "use strict";
  var base = new URL(".", document.currentScript.src);
  var byId = function (id) { return document.getElementById(id); };
  var staticMode = window.PcoDeployment && window.PcoDeployment.mode === "static";
  var loading = false;
  var requestVersion = 0;
  var activeController = null;
  var number = new Intl.NumberFormat("ko-KR");
  var date = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Seoul",
  });

  function text(id, value) { byId(id).textContent = value; }
  function time(value) { return date.format(new Date(value)); }
  function list(id, values) {
    var target = byId(id);
    target.replaceChildren();
    values.forEach(function (value) {
      var item = document.createElement("li");
      item.textContent = value;
      target.appendChild(item);
    });
  }
  function reading(id, resource, prefix) {
    var link = byId(id);
    link.hidden = !resource;
    if (resource) {
      link.href = resource.url;
      link.textContent = prefix + resource.title + " (새 창)";
    } else link.removeAttribute("href");
  }
  function clearRecord() {
    byId("learning-content").replaceChildren();
    byId("learning-content").hidden = true;
  }
  function resetView() {
    requestVersion++;
    if (activeController) activeController.abort();
    activeController = null;
    loading = false;
    clearRecord();
  }
  function render(data) {
    var content = byId("learning-content");
    if (!content.firstElementChild) content.appendChild(byId("learning-template").content.cloneNode(true));
    var student = data.student;
    var guide = data.guide;
    text("learner-name", student.name + "님의 학습 현황");
    text("my-identity", student.school);
    text("my-level", "Lv." + number.format(student.level));
    text("my-tier", !guide.current ? "로드맵 확인 필요" : student.level <= 5 ? "입문 단계" : student.level <= 10 ? "성장 단계" : "도전 단계");
    text("my-level-title", guide.current ? guide.current.title : "로드맵에 없는 레벨");
    text("my-focus", guide.current ? guide.current.focus : "레벨 기준을 담당자에게 확인해 주세요.");
    text("my-modified", "Dataverse 마지막 수정: " + time(student.modifiedAt) + " (마지막 학습 시각을 의미하지 않습니다.)");
    text("my-points", number.format(student.points) + "점");
    text("my-rank", number.format(data.ranking.overall) + "위");
    text("my-rank-note", "전체 " + number.format(data.ranking.overallStudents) + "명 · 학교 " +
      number.format(data.ranking.school) + "위 / " + number.format(data.ranking.schoolStudents) + "명 · 동점 공동 순위");
    text("my-growth", student.observedGrowth === null ? "관측 대기" :
      (student.observedGrowth > 0 ? "+" : "") + number.format(student.observedGrowth) + "점");
    byId("my-growth").className = student.observedGrowth > 0 ? "growth-positive" :
      student.observedGrowth < 0 ? "growth-negative" : "";
    text("my-growth-note", student.observedGrowth === null ? "관측값이 더 쌓이면 변화를 비교할 수 있어요." : "보관 중인 첫 관측 점수 대비 변화");

    byId("unmapped-level").hidden = guide.status !== "unmapped";
    byId("learning-guide").hidden = guide.status === "unmapped";
    text("recommendation-note", guide.recommendationNote);
    if (guide.current) {
      var target = guide.next || guide.current;
      text("next-heading", guide.next ? "다음 목표 · Lv." + target.level + " " + target.title : "Lv.15 · 로드맵 마지막 단계");
      text("next-focus", guide.next ? target.focus : "별도의 Lv.16을 가정하지 않습니다. 완성한 프로젝트를 검증하고 개선하며 학습을 이어가요.");
      text("next-goals-heading", guide.next ? "다음 단계를 준비하는 학습 목표" : "마지막 단계에서 더 깊게 도전하기");
      list("next-goals", target.goals);
      text("promotion-note", guide.promotionNote);
      text("practice-title", guide.practice.title);
      text("practice-task", guide.practice.task);
      list("practice-checks", guide.practice.checks);
      list("review-goals", guide.current.goals);
      reading("review-reading", guide.current.reading, "현재 단계 참고: ");
      reading("next-reading", guide.next && guide.next.reading, "다음 단계 참고: ");
      var roadmap = byId("my-roadmap");
      roadmap.replaceChildren();
      guide.roadmap.forEach(function (entry) {
        var item = document.createElement("li");
        item.textContent = String(entry.level).padStart(2, "0");
        item.title = entry.title;
        item.setAttribute("aria-label", "레벨 " + entry.level + " " + entry.title +
          (entry.level === student.level ? " · 현재" : guide.next && entry.level === guide.next.level ? " · 다음 목표" : ""));
        if (entry.level === student.level) item.setAttribute("aria-current", "step");
        var label = document.createElement("span");
        label.textContent = entry.level === student.level ? "현재" : guide.next && entry.level === guide.next.level ? "다음 목표" : "";
        item.appendChild(label);
        roadmap.appendChild(item);
      });
    }

    text("history-note", data.historyNote);
    var history = byId("my-history");
    history.replaceChildren();
    student.history.slice(-7).reverse().forEach(function (sample) {
      var row = document.createElement("tr");
      [time(sample.at), "Lv." + sample.level, number.format(sample.points) + "점"].forEach(function (value) {
        var cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      history.appendChild(row);
    });
    if (!student.history.length) {
      var row = document.createElement("tr");
      var cell = document.createElement("td");
      cell.colSpan = 3;
      cell.className = "empty";
      cell.textContent = "아직 관측 기록이 없습니다. 과거 학습 이력은 임의로 만들지 않습니다.";
      row.appendChild(cell);
      history.appendChild(row);
    }
    content.hidden = false;
    text("learning-collected", "Dataverse 수집: " + time(data.collectedAt));
    text("learning-status", "내 기록 연결됨");
    byId("learning-status").dataset.state = "connected";
  }
  async function load() {
    if (loading || document.hidden) return;
    loading = true;
    var version = ++requestVersion;
    byId("learning-refresh").disabled = true;
    byId("learning-content").setAttribute("aria-busy", "true");
    byId("learning-error").hidden = true;
    byId("learning-login").hidden = true;
    text("learning-status", "내 기록 확인 중");
    var controller = new AbortController();
    activeController = controller;
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(new URL("api/me/learning", base), {
        cache: "no-store", credentials: "same-origin", signal: controller.signal,
      });
      var data = await response.json();
      if (version !== requestVersion) return;
      if (!response.ok) {
        var error = new Error(data.message || "내 학습 기록을 조회하지 못했습니다.");
        error.status = response.status;
        throw error;
      }
      if (!document.hidden) render(data);
    } catch (error) {
      if (version !== requestVersion) return;
      clearRecord();
      text("learning-collected", "현재 기록을 확인할 수 없습니다. 이전 기록을 대신 표시하지 않습니다.");
      text("learning-status", error.status === 401 ? "로그인 / 재검증 필요" : "내 기록 조회 실패");
      byId("learning-status").dataset.state = "error";
      if (error.status === 401) {
        text("learning-login-message", error.message);
        byId("learning-login").hidden = false;
      } else {
        text("learning-error", error.name === "AbortError" ? "조회 시간이 초과되었습니다. 다시 시도해 주세요." :
          error instanceof TypeError || error instanceof SyntaxError ?
            "서버 연결 또는 JSON 응답을 확인해 주세요. Node.js 서버에서 실행해야 합니다." : error.message);
        byId("learning-error").hidden = false;
        console.error("[my-learning]", error.message);
      }
    } finally {
      clearTimeout(timeout);
      if (version === requestVersion) {
        loading = false;
        activeController = null;
        byId("learning-refresh").disabled = false;
        byId("learning-content").setAttribute("aria-busy", "false");
      }
    }
  }
  var STATIC_KEY = "pco-static-student";
  var STALE_MS = 2 * 60 * 60 * 1000;
  var staticReport = null;
  var staticGuides = null;
  var staticChoice = null;

  function readChoice() {
    try { return JSON.parse(window.localStorage.getItem(STATIC_KEY)) || null; } catch (error) { return null; }
  }
  function writeChoice(student) {
    staticChoice = { id: student.id, school: student.school, name: student.name };
    try { window.localStorage.setItem(STATIC_KEY, JSON.stringify(staticChoice)); } catch (error) { /* 저장은 선택 사항 */ }
  }
  async function getStaticJson(route) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(new URL(route, base), { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("정적 리포트 파일을 불러오지 못했습니다. 배포가 성공했는지 확인해 주세요.");
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  function fillSelect(select, placeholder, items) {
    select.replaceChildren(new Option(placeholder, ""));
    items.forEach(function (item) { select.appendChild(new Option(item.label, item.value)); });
  }
  function fillStudents(school) {
    var rows = staticReport.students.filter(function (s) { return s.school === school; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, "ko") || b.points - a.points; });
    var counts = {};
    rows.forEach(function (s) { counts[s.name] = (counts[s.name] || 0) + 1; });
    fillSelect(byId("static-student"), "학생 선택", rows.map(function (s) {
      return { value: s.id, label: counts[s.name] > 1 ? s.name + " · " + number.format(s.points) + "점" : s.name };
    }));
  }
  function staticRecord(student) {
    var students = staticReport.students;
    var mates = students.filter(function (s) { return s.school === student.school; });
    var guide = staticGuides[student.level];
    if (!guide) throw new TypeError("레벨 가이드가 리포트에 없습니다.");
    return {
      student: student, guide: guide, collectedAt: staticReport.collectedAt,
      ranking: {
        overall: student.rank, overallStudents: students.length,
        school: mates.filter(function (s) { return s.points > student.points; }).length + 1,
        schoolStudents: mates.length,
      },
      historyNote: staticReport.historyNote,
    };
  }
  function showStatic(student) {
    writeChoice(student);
    render(staticRecord(student));
    var age = Date.now() - Date.parse(staticReport.collectedAt);
    text("learning-collected", "배포 시점 수집: " + time(staticReport.collectedAt) +
      (age > STALE_MS ? " · 2시간 이상 경과한 데이터입니다." : ""));
    text("learning-status", "공개 정적 리포트 기준");
    byId("learning-status").dataset.state = age > STALE_MS ? "error" : "connected";
  }
  function findChoice() {
    var choice = staticChoice || readChoice();
    if (!choice) return null;
    var students = staticReport.students;
    var byIdMatch = students.filter(function (s) { return s.id === choice.id; });
    if (byIdMatch.length === 1) return byIdMatch[0];
    var same = students.filter(function (s) { return s.school === choice.school && s.name === choice.name; });
    return same.length === 1 ? same[0] : null;
  }
  async function loadStatic() {
    byId("learning-refresh").disabled = true;
    byId("learning-error").hidden = true;
    text("learning-status", "리포트 확인 중");
    try {
      var results = await Promise.all([getStaticJson("reports/dashboard.json"), getStaticJson("reports/learning-guides.json")]);
      if (results[0].mode !== "static" || !Array.isArray(results[0].students) ||
          !Number.isFinite(Date.parse(results[0].collectedAt)) || !results[1].guides) throw new TypeError("리포트 형식 오류");
      staticReport = results[0];
      staticGuides = results[1].guides;
      var schools = staticReport.schools.slice().sort();
      fillSelect(byId("static-school"), "학교 선택", schools.map(function (s) { return { value: s, label: s }; }));
      byId("learning-picker").hidden = false;
      var chosen = findChoice();
      if (chosen) {
        byId("static-school").value = chosen.school;
        fillStudents(chosen.school);
        byId("static-student").value = chosen.id;
        showStatic(chosen);
      } else {
        fillStudents("");
        clearRecord();
        text("learning-collected", "학교와 이름을 선택하면 배포 시점의 내 기록이 표시됩니다.");
        text("learning-status", "학생 선택 필요");
      }
    } catch (error) {
      clearRecord();
      byId("learning-picker").hidden = true;
      text("learning-status", "리포트 조회 실패");
      byId("learning-status").dataset.state = "error";
      text("learning-collected", "현재 기록을 확인할 수 없습니다. 이전 기록을 대신 표시하지 않습니다.");
      text("learning-error", error.name === "AbortError" ? "조회 시간이 초과되었습니다. 다시 시도해 주세요." :
        error instanceof TypeError || error instanceof SyntaxError ?
          "정적 리포트 파일과 네트워크를 확인해 주세요. Actions에서 배포가 성공했는지 확인해 주세요." : error.message);
      byId("learning-error").hidden = false;
    } finally { byId("learning-refresh").disabled = false; }
  }
  function startStatic() {
    text("learning-refresh-note", "공개 정적 리포트 · 본인 인증 없음 · 시각은 한국 시간");
    byId("static-school").addEventListener("change", function () {
      clearRecord();
      fillStudents(byId("static-school").value);
      text("learning-status", "학생 선택 필요");
    });
    byId("static-student").addEventListener("change", function () {
      var student = staticReport.students.filter(function (s) { return s.id === byId("static-student").value; })[0];
      if (student) showStatic(student); else clearRecord();
    });
    byId("learning-refresh").addEventListener("click", loadStatic);
    loadStatic();
  }
  if (staticMode) { startStatic(); return; }

  byId("learning-refresh").addEventListener("click", load);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) resetView();
    else load();
  });
  window.addEventListener("pco-session-changed", function () { resetView(); load(); });
  window.addEventListener("pagehide", resetView);
  window.addEventListener("pageshow", function (event) { if (event.persisted) { resetView(); load(); } });
  setInterval(load, 60000);
  load();
})();
