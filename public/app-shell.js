(function () {
  var scriptEl =
    document.currentScript ||
    document.querySelector('script[src*="app-shell.js"]');
  var basePath = "/";
  if (scriptEl && scriptEl.src) {
    try {
      basePath = new URL(".", scriptEl.src).pathname;
    } catch (e) {}
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      var isSample = window.location.pathname.indexOf("/pwa-sample") !== -1;
      if (!isSample) {
        navigator.serviceWorker
          .register(basePath + "sw.js")
          .catch(function () {});
      }
    });
  }

  var pages = [
    {
      label: "파코(v3)",
      rel: "index.html",
      match: ["", "index.html", "파코v3"],
    },
    {
      label: "파코 스튜디오",
      rel: "new.html",
      match: ["new.html", "new", "스튜디오"],
    },
    {
      label: "내 학습",
      rel: "my-learning.html",
      match: ["my-learning.html", "my-learning", "내학습"],
    },
    {
      label: "대시보드",
      rel: "dashboard.html",
      match: ["dashboard.html", "대시보드"],
    },
    // {
    //   label: "파코(v3_4)",
    //   rel: "v3_4/index.html",
    //   match: ["v3_4", "v3_4/", "v3_4/index.html", "파코v3_4"],
    // },
    // {
    //   label: "↳ AI코치",
    //   rel: "v3_4/coach.html",
    //   match: ["v3_4/coach.html", "파코v3_4/ai코치"],
    // },
    // {
    //   label: "↳ 레벨 로드맵",
    //   rel: "v3_4/roadmap.html",
    //   match: ["v3_4/roadmap.html", "파코v3_4/레벨-로드맵"],
    // },
    // { label: "파코(v2)", rel: "v2.html", match: ["v2.html", "파코v2"] },
    // {
    //   label: "🧪 PWA 핸즈온 샘플",
    //   rel: "pwa-sample/index.html",
    //   match: ["pwa-sample", "pwa-sample/", "pwa-sample/index.html"],
    // },
  ];
  var staticMode = window.PcoDeployment && window.PcoDeployment.mode === "static";

  var currentPath = decodeURIComponent(window.location.pathname);
  var relCurrent =
    currentPath.indexOf(basePath) === 0
      ? currentPath.slice(basePath.length)
      : currentPath.replace(/^\//, "");

  var bar = document.createElement("div");
  bar.id = "pco-global-bar";
  bar.innerHTML =
    "<style>" +
    '#pco-global-bar{background:#182039;color:#e2e8f0;font-family:"Pretendard Variable",Pretendard,-apple-system,sans-serif;font-size:12.5px;padding:6px 16px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.1);z-index:9999;position:relative}' +
    "#pco-global-bar .pco-brand{font-weight:700;color:#2ec98a;display:flex;align-items:center;gap:6px;white-space:nowrap}" +
    "#pco-global-bar .pco-links{display:flex;align-items:center;gap:4px;flex-wrap:wrap}" +
    "#pco-global-bar a{color:#cbd5e1;text-decoration:none;padding:4px 10px;border-radius:6px;font-weight:600;transition:all .15s}" +
    "#pco-global-bar a:hover{background:rgba(255,255,255,.1);color:#fff}" +
    "#pco-global-bar a.active{background:#2ec98a;color:#111827;font-weight:700}" +
    "</style>" +
    '<div class="pco-brand">🐍 파코(파이썬 코치)</div>' +
    '<nav class="pco-links">' +
    pages
      .map(function (p) {
        var isActive = p.match.indexOf(relCurrent) !== -1;
        return (
          '<a href="' +
          basePath +
          p.rel +
          '" class="' +
          (isActive ? "active" : "") +
          '">' +
          p.label +
          "</a>"
        );
      })
      .join("") +
    "</nav>" +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
    '<span id="pco-session-status" role="status">접속 확인 중</span>' +
    '<a id="pco-session-login" href="' +
    basePath +
    'login.html?reverify=1">로그인 / 재검증</a>' +
    '<button id="pco-session-logout" type="button" hidden style="background:#26354d;color:#fff;border:1px solid #71829c;border-radius:6px;padding:4px 8px;cursor:pointer">로그아웃</button>' +
    "</div>";

  function loadPresence() {
    if (staticMode) {
      document.getElementById("pco-session-status").textContent = "공개 정적 리포트 · 로그인 미지원";
      document.getElementById("pco-session-login").hidden = true;
      document.getElementById("pco-session-logout").hidden = true;
      return;
    }
    if (document.getElementById("pco-presence-script")) return;
    var presence = document.createElement("script");
    presence.id = "pco-presence-script";
    presence.src = basePath + "presence.js";
    // 로컬 정적 모드에서는 presence.js가 호출하기 전에 /api 대체 스크립트가 fetch를 가로채야 합니다.
    if (window.PcoLocalApi) {
      document.head.appendChild(presence);
      return;
    }
    var local = document.createElement("script");
    local.src = basePath + "local-api.js";
    local.onload = local.onerror = function () { document.head.appendChild(presence); };
    document.head.appendChild(local);
  }

  if (document.body) {
    document.body.insertBefore(bar, document.body.firstChild);
    loadPresence();
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      document.body.insertBefore(bar, document.body.firstChild);
      loadPresence();
    });
  }
})();
