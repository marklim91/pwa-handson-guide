(function () {
  "use strict";
  var api = window.PcoLocalApi;
  var byId = function (id) { return document.getElementById(id); };
  var message = byId("message");

  function say(text, ok) {
    message.textContent = text;
    message.className = ok ? "ok" : "error";
  }
  function refresh() {
    var config = api.config();
    byId("flow-url").value = config.flowUrl;
    byId("content-type").value = config.contentType;
    byId("enabled").checked = config.enabled;
    byId("rows-status").textContent = api.hasImportedRows() ? "가져온 JSON이 저장되어 있습니다." : "가져온 JSON이 없습니다.";
  }
  function save() {
    api.saveConfig({
      enabled: byId("enabled").checked, flowUrl: byId("flow-url").value, contentType: byId("content-type").value,
    });
  }

  byId("save").addEventListener("click", function () {
    try {
      save();
      say("저장했습니다. 다른 화면을 새로고침하면 적용됩니다.", true);
    } catch (error) { say(error.message || "설정을 저장하지 못했습니다. URL을 확인해 주세요.", false); }
  });
  byId("rows-file").addEventListener("change", async function (event) {
    var file = event.target.files[0];
    if (!file) return;
    try {
      var count = api.importRows(await file.text());
      refresh();
      say("활성 학생 " + count + "명의 데이터를 가져왔습니다.", true);
    } catch (error) {
      say(error instanceof SyntaxError ? "올바른 JSON 파일이 아닙니다." : error.message, false);
    }
  });
  byId("test").addEventListener("click", async function () {
    try {
      save();
      say("조회 중…", true);
      say("연결되었습니다. 활성 학생 " + (await api.test()) + "명을 확인했습니다.", true);
    } catch (error) { say(error.message || "연결 테스트에 실패했습니다.", false); }
  });
  byId("clear").addEventListener("click", function () {
    if (!window.confirm("저장된 설정, 가져온 데이터, 로그인 세션과 성장 기록을 모두 삭제할까요?")) return;
    api.clearAll();
    refresh();
    say("삭제했습니다.", true);
  });
  refresh();
})();
