(function () {
  "use strict";
  if (window.PcoDeployment && window.PcoDeployment.mode === "static") return;

  var form = document.getElementById("login-form");
  var school = document.getElementById("school");
  var studentId = document.getElementById("student-id");
  var studentName = document.getElementById("student-name");
  var errorMessage = document.getElementById("login-error");
  var submitButton = form.querySelector('button[type="submit"]');
  var submitting = false;

  PcoAuth.schools.forEach(function (name) {
    school.add(new Option(name, name));
  });

  function filterInput(event) {
    if (event.isComposing) return;
    var input = event.target;
    input.value = input === studentId
      ? input.value.replace(/[^0-9]/g, "")
      : input.value.replace(/[^\p{L}\p{M}]/gu, "");
    errorMessage.textContent = "";
  }

  [studentId, studentName].forEach(function (input) {
    input.addEventListener("input", filterInput);
    input.addEventListener("compositionend", filterInput);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (submitting) return;
    errorMessage.textContent = "";
    if (!form.reportValidity()) return;
    var student = {
      school: school.value,
      studentId: studentId.value,
      studentName: studentName.value,
    };
    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "학생 정보 확인 중...";
    form.setAttribute("aria-busy", "true");
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(PcoAuth.verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(student),
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.status === 404 || response.status === 405) {
        throw new Error("학생 검증 API를 사용할 수 없습니다. Node.js 서버로 실행하거나, 로컬 정적 모드라면 local-setup.html에서 설정(또는 local-api.js의 DEFAULTS에 URL 입력)을 확인해 주세요.");
      }
      var result = await response.json();
      if (!response.ok || !result || result.verified !== true) {
        throw new Error(result && result.message || "학생 정보 확인에 실패했습니다. 관리자에게 문의해 주세요.");
      }
      PcoAuth.saveLogin(student.school, student.studentId);
      location.replace(PcoAuth.homeUrl);
    } catch (error) {
      errorMessage.textContent = error.name === "AbortError"
        ? "학생 정보 확인 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
        : error instanceof TypeError || error instanceof SyntaxError
          ? "학생 검증 서비스에 연결할 수 없습니다. 네트워크와 서버 설정을 확인해 주세요."
          : error.message;
    } finally {
      clearTimeout(timeout);
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = "로그인";
      form.removeAttribute("aria-busy");
    }
  });

  submitButton.disabled = false;
})();
