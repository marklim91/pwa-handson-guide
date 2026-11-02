(function (root) {
const docs = page => `https://docs.python.org/ko/3/tutorial/${page}`;

const curriculum = [
  {
    title: 'Python 입문자', focus: '코드를 실행하고 결과를 읽는 기본 흐름을 익혀요.',
    goals: ['편집기에서 파일을 저장하고 실행하기', '간단한 출력문의 실행 결과 예상하기', '오류 메시지의 줄 번호 확인하기'],
    practice: { title: '나를 소개하는 첫 프로그램', task: '인사말과 좋아하는 활동을 각각 다른 줄에 출력하는 프로그램을 작성해 보세요.', checks: ['원하는 문장이 순서대로 출력되나요?', '문장을 바꾸고 다시 실행할 수 있나요?'] },
    reading: { title: 'Python 공식 자습서 · 간략한 소개', url: docs('introduction.html') },
  },
  {
    title: '변수 탐험가', focus: '값을 변수에 저장하고 자료형에 맞게 사용해요.',
    goals: ['변수에 값을 저장하고 다시 사용하기', '숫자와 문자열의 차이 설명하기', '값을 바꾸었을 때 결과가 어떻게 달라지는지 확인하기'],
    practice: { title: '간식 가격 계산기', task: '가격과 개수를 각각 변수에 저장하고 전체 금액을 계산해 보세요.', checks: ['가격이나 개수만 바꾸어도 결과가 달라지나요?', '숫자 계산과 문자열 연결의 차이를 설명할 수 있나요?'] },
    reading: { title: 'Python 공식 자습서 · 숫자와 텍스트', url: docs('introduction.html') },
  },
  {
    title: '출력 마스터', focus: '계산 결과를 읽기 쉬운 문장으로 표현해요.',
    goals: ['여러 값을 구분해서 출력하기', 'f-string으로 값과 문장을 함께 표현하기', '줄바꿈과 출력 형식 점검하기'],
    practice: { title: '나만의 영수증', task: '상품명, 개수, 합계를 포함한 영수증을 보기 좋게 출력해 보세요.', checks: ['값이 달라져도 문장이 올바르게 출력되나요?', '다른 사람이 결과만 보고 내용을 이해할 수 있나요?'] },
    reading: { title: 'Python 공식 자습서 · 입력과 출력', url: docs('inputoutput.html') },
  },
  {
    title: '조건문 도전자', focus: '조건에 따라 다른 동작을 선택해요.',
    goals: ['비교 연산자의 결과 예상하기', 'if / elif / else로 경우 나누기', '조건의 경계값을 직접 시험하기'],
    practice: { title: '점수별 안내 메시지', task: '점수 범위에 따라 서로 다른 안내를 출력하고, 각 범위의 경계값을 시험해 보세요.', checks: ['모든 점수 범위에 맞는 결과가 나오나요?', '경계 바로 아래·경계·바로 위를 확인했나요?'] },
    reading: { title: 'Python 공식 자습서 · if 문', url: docs('controlflow.html#if-statements') },
  },
  {
    title: '반복문 탐험가', focus: '반복되는 작업을 규칙으로 표현해요.',
    goals: ['for와 range의 반복 범위 확인하기', '누적값을 반복문 밖에서 초기화하기', 'while의 종료 조건 설명하기'],
    practice: { title: '범위 안의 짝수 합', task: '1부터 입력한 양의 정수까지 짝수만 더하는 프로그램을 작성해 보세요.', checks: ['1, 2, 10을 각각 시험했나요?', '시작값·끝값·누적값이 어떤 역할인지 설명할 수 있나요?'] },
    reading: { title: 'Python 공식 자습서 · for와 range', url: docs('controlflow.html#for-statements') },
  },
  {
    title: '함수 설계자', focus: '반복해서 사용할 동작을 함수로 분리해요.',
    goals: ['def로 이름 있는 함수 만들기', '매개변수와 반환값의 역할 구분하기', '다른 입력으로 같은 함수를 반복 시험하기'],
    practice: { title: '재사용 가능한 합계 함수', task: '가격과 개수를 받아 총금액을 반환하는 함수를 만들고 세 가지 입력으로 시험해 보세요.', checks: ['함수 안의 출력과 반환값을 구분했나요?', '개수가 0인 경우에도 예상대로 동작하나요?'] },
    reading: { title: 'Python 공식 자습서 · 함수 정의하기', url: docs('controlflow.html#defining-functions') },
  },
  {
    title: '리스트 사용자', focus: '여러 값을 목록으로 저장하고 처리해요.',
    goals: ['인덱스와 리스트 길이 확인하기', '항목 추가·변경·삭제하기', '반복문으로 리스트의 값을 처리하기'],
    practice: { title: '점수 목록 요약', task: '점수 리스트의 합계와 평균을 구하고 빈 리스트인 경우도 처리해 보세요.', checks: ['값이 한 개일 때와 여러 개일 때를 시험했나요?', '빈 리스트에서 0으로 나누지 않도록 했나요?'] },
    reading: { title: 'Python 공식 자습서 · 리스트', url: docs('datastructures.html#more-on-lists') },
  },
  {
    title: '딕셔너리 관리자', focus: '키와 값으로 정보를 연결해요.',
    goals: ['키로 값을 찾고 갱신하기', '없는 키를 안전하게 처리하기', '딕셔너리를 순회하며 정보 출력하기'],
    practice: { title: '단어 등장 횟수 세기', task: '여러 단어가 담긴 목록에서 단어별 등장 횟수를 딕셔너리에 저장해 보세요.', checks: ['처음 등장한 단어도 처리되나요?', '같은 단어가 여러 번 나왔을 때 정확히 누적되나요?'] },
    reading: { title: 'Python 공식 자습서 · 딕셔너리', url: docs('datastructures.html#dictionaries') },
  },
  {
    title: '문자열 전문가', focus: '문자열을 나누고 정리해 필요한 정보를 찾아요.',
    goals: ['인덱싱과 슬라이싱의 범위 확인하기', 'strip·split·join의 역할 구분하기', '빈 입력과 불필요한 공백 처리하기'],
    practice: { title: '쉼표로 구분된 단어 정리', task: '쉼표로 구분된 입력을 단어 목록으로 바꾸고 앞뒤 공백과 빈 항목을 정리해 보세요.', checks: ['공백이 포함된 입력을 시험했나요?', '입력이 비어 있을 때도 정상 동작하나요?'] },
    reading: { title: 'Python 공식 자습서 · 텍스트', url: docs('introduction.html#text') },
  },
  {
    title: '파일 처리 마스터', focus: '파일에 정보를 저장하고 다시 읽어요.',
    goals: ['with 문으로 파일 열고 닫기', '읽기·쓰기 모드의 차이 확인하기', '한글 인코딩과 파일 경로 확인하기'],
    practice: { title: '다시 읽을 수 있는 학습 메모', task: '짧은 학습 메모를 UTF-8 파일에 저장하고 다시 읽어 같은 내용인지 확인해 보세요.', checks: ['한글이 깨지지 않나요?', '쓰기 모드가 기존 내용을 덮어쓰는지 확인했나요?'] },
    reading: { title: 'Python 공식 자습서 · 파일 읽고 쓰기', url: docs('inputoutput.html#reading-and-writing-files') },
  },
  {
    title: '모듈 활용가', focus: '표준 라이브러리와 직접 만든 모듈을 활용해요.',
    goals: ['import한 기능의 사용법 확인하기', '자주 쓰는 함수를 모듈로 분리하기', '모듈 파일 이름이 표준 라이브러리와 겹치지 않게 하기'],
    practice: { title: '계산 기능을 모듈로 분리하기', task: '이전에 만든 계산 함수를 별도 파일로 옮기고 다른 파일에서 불러 사용해 보세요.', checks: ['파일을 분리해도 결과가 동일한가요?', '가져온 함수의 입력과 출력을 설명할 수 있나요?'] },
    reading: { title: 'Python 공식 자습서 · 모듈', url: docs('modules.html') },
  },
  {
    title: '디버깅 전문가', focus: '오류를 재현하고 원인을 좁혀 수정해요.',
    goals: ['오류 메시지와 발생 위치 읽기', '작은 입력으로 문제를 재현하기', '예상 가능한 예외만 구체적으로 처리하기'],
    practice: { title: '안전한 숫자 입력', task: '숫자로 바꿀 수 없는 입력을 구체적인 예외 처리로 안내하고, 정상 입력은 계산에 사용해 보세요.', checks: ['정상 입력과 잘못된 입력을 모두 시험했나요?', '오류를 숨기지 않고 원인을 안내하나요?'] },
    reading: { title: 'Python 공식 자습서 · 에러와 예외', url: docs('errors.html') },
  },
  {
    title: '문제 해결자', focus: '큰 문제를 작은 단계로 나누고 검증해요.',
    goals: ['입력·처리·출력을 먼저 정리하기', '작은 함수로 문제를 나누기', '정상·경계·잘못된 입력의 시험 사례 만들기'],
    practice: { title: '단어 통계 도구 설계', task: '문장에서 단어 수와 자주 나온 단어를 구하는 도구를 입력 정리·집계·출력 단계로 나누어 보세요.', checks: ['코드를 쓰기 전에 단계별 계획을 적었나요?', '빈 문장과 반복 단어를 포함한 사례를 시험했나요?'] },
    reading: { title: 'Python 공식 자습서 · 함수와 제어 흐름', url: docs('controlflow.html') },
  },
  {
    title: '프로젝트 개발자', focus: '여러 기능을 연결해 작은 프로그램을 완성해요.',
    goals: ['프로젝트의 필수 기능과 범위 정하기', '함수·자료 구조·파일 저장 연결하기', '사용 방법과 제한 사항을 문서로 정리하기'],
    practice: { title: '학습 메모 관리 프로젝트', task: '메모 추가·목록 확인·파일 저장 기능을 갖춘 작은 프로그램을 만들어 보세요.', checks: ['종료 후 다시 실행해도 저장한 내용을 읽을 수 있나요?', '다른 사람이 사용 설명을 보고 실행할 수 있나요?'] },
    reading: { title: 'Python 공식 자습서 · 모듈 구성', url: docs('modules.html') },
  },
  {
    title: 'Python Junior Developer', focus: '완성한 프로그램을 테스트하고 개선해요.',
    goals: ['실제 사용자 피드백으로 개선점 찾기', '기존 동작을 지키는 시험 사례 추가하기', '선택한 설계와 개선 결과를 설명하기'],
    practice: { title: '나만의 프로젝트 개선 리포트', task: '기존 프로젝트에서 개선점 하나를 골라 수정 전후 동작과 검증 결과를 정리해 보세요.', checks: ['기존 기능이 유지되는지 확인했나요?', '무엇을 왜 바꾸었는지 다른 사람에게 설명할 수 있나요?'] },
    reading: { title: 'Python 공식 자습서 · 전체 목차', url: docs('') },
  },
].map((entry, index) => ({ level: index + 1, ...entry }));

function getLearningGuide(level) {
  const mapped = Number.isInteger(level) && level >= 1 && level <= curriculum.length;
  const current = mapped ? curriculum[level - 1] : null;
  const next = mapped && level < curriculum.length ? curriculum[level] : null;
  return structuredClone({
    status: !mapped ? 'unmapped' : next ? 'next-level' : 'last-level',
    current, next, practice: (next || current)?.practice || null,
    roadmap: curriculum.map(entry => ({ level: entry.level, title: entry.title })),
    recommendationNote: '기존 15단계 로드맵에 따른 권장 학습 가이드입니다. 개인 오답이나 취약점을 분석한 결과는 아닙니다.',
    promotionNote: '승급에 필요한 점수와 평가 기준은 연결된 데이터에 없습니다. 아래 과제는 권장 연습이며 완료만으로 레벨이나 점수가 변경되지 않습니다.',
  });
}

const api = { getLearningGuide };
if (typeof module === 'object' && module.exports) module.exports = api;
else root.PcoLearningGuide = api;
})(typeof window !== 'undefined' ? window : globalThis);
