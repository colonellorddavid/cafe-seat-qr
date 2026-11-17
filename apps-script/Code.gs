/**
 * cafe-seat-qr · QR 좌석 체크인 (구글 Apps Script 웹 앱 하나로 동작)
 * 설치 방법: README.md / docs/설치가이드.html
 *
 *   .../exec        → 좌석 현황 (발표 화면용, 5초마다 자동 갱신)
 *   .../exec?p=in   → 입장: 빈자리를 눌러 앉기
 *   .../exec?p=out  → 퇴장: 내 자리를 눌러 나가기
 *
 * 기록은 이 스프레드시트의 '좌석기록' 시트에 자동으로 쌓입니다 (없으면 자동 생성).
 * 발표 직전 초기화: 위쪽 함수 목록에서 clearLog 를 고르고 ▷ 실행.
 */
// ===== 설정 시작 (SETTINGS START) =====
// tools/seat-editor.html 에서 만든 설정을 이 줄과 '설정 끝' 줄 사이에 통째로 붙여넣으세요.
const CAFE_NAME = '우리 카페';   // 카페 이름
const STAY_MIN = 90;            // 퇴장을 안 눌러도 이 시간(분)이 지나면 빈자리로
const CALM = 0.4, BUSY = 0.75;  // 40% 미만 한산, 75% 이상 혼잡

// 좌석 배치: from~to = 좌석 번호 범위, outlet = 콘센트가 있는 번호 범위 (없으면 [0, 0])
const ZONES = [
  { name: '창가 바', note: '조용함',    from: 1,  to: 10, outlet: [1, 10] },
  { name: '2인석',   note: '보통',      from: 11, to: 26, outlet: [11, 18] },
  { name: '4인석',   note: '대화 많음', from: 27, to: 38, outlet: [27, 30] },
  { name: '소파',    note: '대화 많음', from: 39, to: 40, outlet: [0, 0] }
];
// ===== 설정 끝 (SETTINGS END) =====

const LOG = '좌석기록';
const SEATS = ZONES.reduce(function (n, z) { return n + (z.to - z.from + 1); }, 0);

function doGet(e) {
  const p = (e && e.parameter && e.parameter.p) || 'view';
  const mode = (p === 'in' || p === 'out') ? p : 'view';
  const boot = {
    mode: mode, cafe: CAFE_NAME, zones: ZONES, seats: SEATS, stay: STAY_MIN,
    url: ScriptApp.getService().getUrl(), state: getState()
  };
  const json = JSON.stringify(boot).replace(/</g, '\\u003c');
  const html = PAGE.replace('__BOOT__', function () { return json; });
  const title = mode === 'in' ? '입장' : mode === 'out' ? '퇴장' : '좌석 현황';
  return HtmlService.createHtmlOutput(html)
    .setTitle(CAFE_NAME + ' ' + title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(LOG);
  if (!sh) { sh = ss.insertSheet(LOG); sh.appendRow(['시간', '좌석', '구분']); }
  return sh;
}

// 지금 앉아 있는 자리 = 마지막 기록이 '입장'이고 STAY_MIN 안에 들어온 자리
function getState() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const now = new Date(), since = now.getTime() - STAY_MIN * 60000;
  const last = {};
  rows.forEach(function (r) {
    if (r[0] instanceof Date) last[Number(r[1])] = { t: r[0].getTime(), a: r[2] };
  });
  const taken = [];
  Object.keys(last).forEach(function (s) {
    if (last[s].a === '입장' && last[s].t > since) taken.push(Number(s));
  });
  const ratio = taken.length / SEATS;
  return {
    taken: taken,
    used: taken.length,
    level: ratio < CALM ? 'calm' : ratio < BUSY ? 'mid' : 'busy',
    time: Utilities.formatDate(now, 'Asia/Seoul', 'HH:mm:ss')
  };
}

function record_(seat, action) {
  seat = Number(seat);
  if (!(seat >= 1 && seat <= SEATS)) return { ok: false, msg: '없는 자리 번호예요.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const st = getState();
    const isTaken = st.taken.indexOf(seat) >= 0;
    if (action === '입장' && isTaken) return { ok: false, msg: seat + '번은 방금 다른 분이 앉았어요. 다른 자리를 골라주세요.', state: st };
    if (action === '퇴장' && !isTaken) return { ok: true, msg: seat + '번은 이미 빈자리예요.', state: st };
    sheet_().appendRow([new Date(), seat, action]);
    SpreadsheetApp.flush();
    return { ok: true, state: getState() };
  } finally {
    lock.releaseLock();
  }
}
function checkIn(seat)  { return record_(seat, '입장'); }
function checkOut(seat) { return record_(seat, '퇴장'); }

// 발표 직전에 한 번 실행: 기록을 모두 지우고 제목 줄만 남김
function clearLog() {
  const sh = sheet_();
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
}

const PAGE = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<style>
:root{--bg:#F3F5F2;--card:#fff;--line:#D6DDD5;--fg:#1C2420;--muted:#5D6A63;--accent:#1F6B57;
--calm:#2E8B57;--calm-bg:#E1F2E8;--mid:#B7791F;--mid-bg:#FBF0DC;--busy:#C0392B;--busy-bg:#F8E1DE;
--free:#fff;--used:#9AA59F;--zone:#E8ECE7;--me:#2F6FE0}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:15px;line-height:1.5}
.wrap{max-width:760px;margin:0 auto;padding:16px 16px 120px}
h1{font-size:20px;margin:0}
.sub{color:var(--muted);font-size:13px;margin:2px 0 14px}
.banner{border-radius:14px;padding:14px 16px;margin-bottom:14px;font-weight:600}
.banner.in{background:#E3EAFB;color:#1E3F8A}
.banner.out{background:#FDEEE2;color:#8A3E12}
.level{border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:14px}
.level .big{font-size:48px;font-weight:800;line-height:1}
.level .nums{display:flex;gap:22px;flex-wrap:wrap}
.level .nums b{font-size:22px;display:block}
.level .nums span{font-size:12px;color:var(--muted)}
.calm{background:var(--calm-bg)}.calm .big{color:var(--calm)}
.mid{background:var(--mid-bg)}.mid .big{color:var(--mid)}
.busy{background:var(--busy-bg)}.busy .big{color:var(--busy)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}
.legend{display:flex;gap:14px;font-size:13px;color:var(--muted);margin-bottom:10px;flex-wrap:wrap}
.legend i{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:4px;border:1px solid var(--line)}
.zone{margin-top:12px}
.zone .zh{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px}
.zone .zh b{font-size:14px}
.seats{display:flex;flex-wrap:wrap;gap:6px;background:var(--zone);padding:8px;border-radius:12px}
.seat{width:46px;height:46px;border-radius:9px;border:1px solid var(--line);background:var(--free);font-weight:700;font-size:14px;color:var(--fg);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;cursor:default;font-family:inherit}
.seat small{font-size:9px;line-height:1;color:#E07B00}
.seat.taken{background:var(--used);border-color:var(--used);color:#fff}
.seat.me{background:var(--me);border-color:var(--me);color:#fff}
.seat.pick{outline:3px solid var(--fg);outline-offset:2px}
.seat.can{cursor:pointer}
.seat.can:hover{transform:translateY(-1px)}
.seat:disabled{opacity:1}
.bar{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:12px 16px calc(12px + env(safe-area-inset-bottom));box-shadow:0 -4px 16px rgb(0 0 0/.08)}
.bar .in{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.bar .msg{flex:1;min-width:180px;font-weight:600}
.btn{border:0;border-radius:10px;padding:12px 20px;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer;background:var(--accent);color:#fff}
.btn.ghost{background:var(--zone);color:var(--fg)}
.btn.warn{background:#C0392B}
.btn:disabled{opacity:.5}
.foot{color:var(--muted);font-size:12px;margin-top:10px}
.toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);background:var(--fg);color:#fff;padding:10px 16px;border-radius:10px;font-weight:600;z-index:9;max-width:92%;text-align:center}
</style></head><body>
<div class="wrap">
  <h1 id="cafe"></h1>
  <div class="sub" id="sub"></div>
  <div id="banner"></div>
  <div class="level" id="level"></div>
  <div class="card">
    <div class="legend"><span><i></i>빈자리</span><span><i style="background:var(--used);border-color:var(--used)"></i>사용 중</span><span id="lgme" hidden><i style="background:var(--me);border-color:var(--me)"></i>내 자리</span><span style="color:#E07B00">⚡ 콘센트</span></div>
    <div id="map"></div>
  </div>
  <div class="foot" id="foot"></div>
</div>
<div class="bar" id="bar" hidden><div class="in"><div class="msg" id="barmsg"></div><span id="barbtns"></span></div></div>
<script>
var B = __BOOT__;
var S = B.state, pick = null, busy = false, mine = null;
try { mine = Number(localStorage.getItem('mySeat')) || null; } catch (e) {}
function saveMine(v){ mine = v; try { v ? localStorage.setItem('mySeat', v) : localStorage.removeItem('mySeat'); } catch (e) {} }
var LV = { calm: '한산', mid: '보통', busy: '혼잡' };
function $(id){ return document.getElementById(id); }
function isTaken(n){ return S.taken.indexOf(n) >= 0; }
function toast(t){ var d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(function(){ d.remove(); }, 2600); }

function render(){
  if (mine && !isTaken(mine)) saveMine(null);   // 시간이 지나 자동 퇴장된 경우
  if (pick && B.mode === 'in' && isTaken(pick)) pick = null;
  $('cafe').textContent = B.cafe;
  $('sub').textContent = S.time + ' 기준 · 좌석 ' + B.seats + '석 · ' + B.stay + '분 지나면 자동 퇴장';
  var bn = '';
  if (B.mode === 'in') bn = mine ? '<div class="banner in">' + mine + '번 자리에 앉아 계세요. 나갈 때 아래 [퇴장하기]를 눌러주세요.</div>' : '<div class="banner in">빈자리(흰색)를 눌러 앉을 자리를 고르세요.</div>';
  if (B.mode === 'out') bn = '<div class="banner out">' + (mine ? '아래 [퇴장하기]를 누르면 ' + mine + '번 자리가 비워져요.' : '나가실 자리(회색)를 눌러주세요.') + '</div>';
  $('banner').innerHTML = bn;
  var lv = $('level'); lv.className = 'level ' + S.level;
  lv.innerHTML = '<div><div style="font-size:12px;color:var(--muted)">지금 매장 분위기</div><div class="big">' + LV[S.level] + '</div></div>' +
    '<div class="nums"><div><b>' + S.used + '명</b><span>사용 중</span></div><div><b>' + (B.seats - S.used) + '석</b><span>빈자리</span></div><div><b>' + Math.round(S.used / B.seats * 100) + '%</b><span>좌석 사용률</span></div></div>';
  $('lgme').hidden = !mine;
  var h = '';
  B.zones.forEach(function (z) {
    var free = 0, cells = '';
    for (var n = z.from; n <= z.to; n++) {
      var t = isTaken(n); if (!t) free++;
      var cls = 'seat' + (n === mine ? ' me' : t ? ' taken' : '') + (n === pick ? ' pick' : '');
      var can = (B.mode === 'in' && !t && !mine) || (B.mode === 'out' && t && !mine);
      if (can) cls += ' can';
      var out = (n >= z.outlet[0] && n <= z.outlet[1]) ? '<small>⚡</small>' : '';
      cells += '<button class="' + cls + '" data-n="' + n + '"' + (can ? '' : ' disabled') + '>' + n + out + '</button>';
    }
    h += '<div class="zone"><div class="zh"><span><b>' + z.name + '</b> · ' + z.note + '</span><span>' + free + '/' + (z.to - z.from + 1) + ' 빈자리</span></div><div class="seats">' + cells + '</div></div>';
  });
  $('map').innerHTML = h;
  $('foot').textContent = B.mode === 'view' ? '5초마다 자동으로 바뀝니다. 입장/퇴장은 QR을 찍어 주세요.' : '화면은 5초마다 자동으로 바뀝니다.';
  renderBar();
}

function renderBar(){
  var bar = $('bar'), msg = '', btns = '';
  if (B.mode === 'in') {
    if (mine) { msg = '내 자리: ' + mine + '번'; btns = '<button class="btn warn" id="go-out">퇴장하기</button>'; }
    else if (pick) { msg = pick + '번 자리에 앉을까요?'; btns = '<button class="btn ghost" id="cancel">취소</button> <button class="btn" id="go-in">앉기</button>'; }
  } else if (B.mode === 'out') {
    var s = mine || pick;
    if (s) { msg = s + '번 자리에서 나갈까요?'; btns = (mine ? '' : '<button class="btn ghost" id="cancel">취소</button> ') + '<button class="btn warn" id="go-out">퇴장하기</button>'; }
  }
  bar.hidden = !msg;
  $('barmsg').textContent = msg;
  $('barbtns').innerHTML = btns;
  if ($('cancel')) $('cancel').onclick = function(){ pick = null; render(); };
  if ($('go-in')) $('go-in').onclick = function(){ send('checkIn', pick); };
  if ($('go-out')) $('go-out').onclick = function(){ send('checkOut', mine || pick); };
}

function send(fn, seat){
  if (busy || !seat) return; busy = true;
  document.querySelectorAll('.bar .btn').forEach(function(b){ b.disabled = true; });
  google.script.run.withSuccessHandler(function(r){
    busy = false;
    if (r.state) S = r.state;
    if (fn === 'checkIn' && r.ok) { saveMine(seat); toast(seat + '번 입장 완료!'); }
    if (fn === 'checkOut' && r.ok) { saveMine(null); toast(r.msg || (seat + '번 퇴장 완료. 감사합니다!')); }
    if (!r.ok) toast(r.msg);
    pick = null; render();
  }).withFailureHandler(function(e){
    busy = false; toast('연결이 잠깐 끊겼어요. 다시 눌러주세요.'); render();
  })[fn](seat);
}

$('map').addEventListener('click', function(e){
  var b = e.target.closest('.seat.can'); if (!b) return;
  pick = Number(b.getAttribute('data-n')); render();
});

function poll(){
  if (busy) return;
  google.script.run.withSuccessHandler(function(st){ if (!busy) { S = st; render(); } }).getState();
}
render();
setInterval(poll, 5000);
</script>
</body></html>`;
