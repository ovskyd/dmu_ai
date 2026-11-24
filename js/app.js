let currentScreen = 'home';
let currentUser = JSON.parse(localStorage.getItem('fin_calc_user')) || null;
let currentMypageTab = 'history';

const initialMockHistory = [
    { id: 1, type: 'deposit', title: '예금 계산', date: '2026.11.03', amount: '10,296,100원', sub: '원금 1,000만원 · 연 3.5%' },
    { id: 2, type: 'savings', title: '적금 계산', date: '2026.11.02', amount: '3,665,988원', sub: '월 30만원 · 연 4.0%' }
];

function getHistory() {
    const data = localStorage.getItem('fin_calc_history');
    return data ? JSON.parse(data) : initialMockHistory;
}

function saveHistoryData(data) {
    localStorage.setItem('fin_calc_history', JSON.stringify(data));
}

function getUsersDB() {
    const users = localStorage.getItem('fin_calc_users');
    return users ? JSON.parse(users) : [];
}

function saveUsersDB(users) {
    localStorage.setItem('fin_calc_users', JSON.stringify(users));
}

// ================= Google Sheets 기록 저장 (기존 Apps Script 그대로 사용) =================
// doPost가 { sheet: '탭이름', 헤더명: 값 ... } 를 받아 해당 탭의 헤더와 이름이 같은 열에 한 줄 추가합니다.
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxPffF_RgVx79paq_XJNKNHcer42E8q73t_ngB_0YT-qbPGsLPbfBlKaBS4fXfKdUd0iQ/exec';
const SHEET_USERS   = 'users';    // 회원가입 기록 탭 이름 (헤더: email, name, pw, createdAt)
const SHEET_LOGIN   = 'login';    // 로그인/로그아웃 기록 탭 이름 (헤더: event, name, email, createdAt)
const SHEET_HISTORY = 'history';  // 계산 기록 탭 이름

function sheetLog(sheet, data) {
    try {
        fetch(SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // preflight 방지
            body: JSON.stringify(Object.assign({ sheet: sheet }, data))
        })
        .then(r => r.text())
        .then(txt => {
            let r = null;
            try { r = JSON.parse(txt); } catch (e) {}
            if (!r || !r.ok) {
                const reason = r && r.error ? r.error : txt.slice(0, 80);
                console.warn('[Sheet] 저장 실패 (' + sheet + '):', reason, txt);
                setTimeout(() => showToast('시트 저장 실패(' + sheet + '): ' + reason), 2200);
            } else {
                console.log('[Sheet] 저장 성공 (' + sheet + ')', r);
            }
        })
        .catch(e => {
            console.warn('[Sheet] 전송 실패 (' + sheet + '):', e);
            setTimeout(() => showToast('시트 전송 실패(' + sheet + '): ' + e.message), 2200);
        });
    } catch (e) {
        console.warn('[Sheet] 오류:', e);
    }
}

function navTo(screenId) {
    currentScreen = screenId;
    document.querySelectorAll('.page-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenId}`).classList.add('active');

    const titles = { 'home':'금융 계산기', 'savings':'저축 계산', 'loan':'대출 계산', 'mypage':'마이페이지 & 내 기록', 'earlycancel':'중도해지 계산', 'guide':'금융 용어 & 가이드' };
    document.getElementById('header-title').textContent = titles[screenId];

    document.querySelectorAll('.nav-item').forEach(b => {
        b.classList.remove('text-indigo-600');
        b.classList.add('text-slate-400');
    });
    const activeNav = document.getElementById(`nav-${screenId}`);
    if(activeNav) {
        activeNav.classList.remove('text-slate-400');
        activeNav.classList.add('text-indigo-600');
    }

    if (screenId === 'home') renderHomeRecent();
    if (screenId === 'mypage') renderMypage();
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

function formatNum(num) { return Math.round(num).toLocaleString('ko-KR'); }

// 숫자를 읽기 쉬운 한글 금액으로 변환 (예: 10000000 -> 1,000만원, 100000000 -> 1억원)
function formatKoreanCurrency(value) {
    const num = Math.floor(Number(value));
    if (!num || num <= 0 || isNaN(num)) return '';

    const units = [
        { unit: 1000000000000, label: '조' },
        { unit: 100000000, label: '억' },
        { unit: 10000, label: '만' }
    ];

    let remainder = num;
    const parts = [];

    for (const { unit, label } of units) {
        const quotient = Math.floor(remainder / unit);
        if (quotient > 0) {
            parts.push(`${quotient.toLocaleString('ko-KR')}${label}`);
            remainder %= unit;
        }
    }

    if (remainder > 0) {
        parts.push(remainder.toLocaleString('ko-KR'));
    }

    return `${parts.join(' ')}원`;
}

function bindKoreanAmountHint(inputId, hintId) {
    const input = document.getElementById(inputId);
    const hint = document.getElementById(hintId);
    if (!input || !hint) return;

    const update = () => {
        const formatted = formatKoreanCurrency(input.value);
        hint.textContent = formatted;
        hint.classList.toggle('hidden', !formatted);
    };

    input.addEventListener('input', update);
    update();
}

function updateHeaderAuthUI() {
    const container = document.getElementById('header-user-status');
    if (currentUser) {
        container.innerHTML = `
            <button onclick="handleLogout()" class="bg-white/10 hover:bg-white/20 text-indigo-100 text-[11px] px-2.5 py-1 rounded-full border border-white/20">
                로그아웃
            </button>
        `;
    } else {
        container.innerHTML = `
            <button onclick="openAuthModal('login')" class="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md transition-all font-semibold active-tap">
                로그인
            </button>
        `;
    }
}

function openAuthModal(mode) {
    toggleAuthMode(mode);
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function openPrivacyModal() {
    document.getElementById('privacy-modal').classList.remove('hidden');
}

function closePrivacyModal() {
    document.getElementById('privacy-modal').classList.add('hidden');
}

function toggleAuthMode(mode) {
    if (mode === 'login') {
        document.getElementById('modal-mode-login').classList.remove('hidden');
        document.getElementById('modal-mode-signup').classList.add('hidden');
    } else {
        document.getElementById('modal-mode-login').classList.add('hidden');
        document.getElementById('modal-mode-signup').classList.remove('hidden');
    }
}

function handleAuthSubmit(event, type) {
    event.preventDefault();
    const users = getUsersDB();

    if (type === 'signup') {
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const pw = document.getElementById('signup-pw').value;

        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            showToast('이미 가입된 이메일입니다. 로그인해 주세요.');
            toggleAuthMode('login');
            document.getElementById('login-email').value = email;
            return;
        }

        const newUser = { name, email, pw };
        users.push(newUser);
        saveUsersDB(users);

        currentUser = { name, email };
        localStorage.setItem('fin_calc_user', JSON.stringify(currentUser));
        sheetLog(SHEET_USERS, { email, name }); // 비밀번호(pw)는 시트에 보내지 않음
        showToast(`${name}님, 회원가입 완료 및 로그인되었습니다!`);
        closeAuthModal();
        updateHeaderAuthUI();
        renderHomeRecent();
        if (currentScreen === 'mypage') renderMypage();

    } else {
        const email = document.getElementById('login-email').value.trim();
        const pw = document.getElementById('login-pw').value;

        const matchedUser = users.find(u => u.email === email);

        if (!matchedUser) {
            showToast('가입되지 않은 계정입니다. 회원가입을 먼저 진행해주세요.');
            toggleAuthMode('signup');
            document.getElementById('signup-email').value = email;
            return;
        }

        if (matchedUser.pw !== pw) {
            showToast('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
            return;
        }

        currentUser = { name: matchedUser.name, email: matchedUser.email };
        localStorage.setItem('fin_calc_user', JSON.stringify(currentUser));
        sheetLog(SHEET_LOGIN, { event: 'login', name: matchedUser.name, email: matchedUser.email });
        showToast(`${matchedUser.name}님, 환영합니다!`);
        closeAuthModal();
        updateHeaderAuthUI();
        renderHomeRecent();
        if (currentScreen === 'mypage') renderMypage();
    }
}

function handleLogout() {
    if (currentUser) sheetLog(SHEET_LOGIN, { event: 'logout', name: currentUser.name, email: currentUser.email });
    currentUser = null;
    localStorage.removeItem('fin_calc_user');
    updateHeaderAuthUI();
    renderHomeRecent();
    showToast('로그아웃 되었습니다.');
    if (currentScreen === 'mypage') renderMypage();
}

function renderMypage() {
    const card = document.getElementById('mypage-user-card');
    const lockCard = document.getElementById('mypage-auth-lock-card');
    const historyArea = document.getElementById('area-mypage-history');
    const compareArea = document.getElementById('area-mypage-compare');

    if (currentUser) {
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md">
                    ${currentUser.name.charAt(0)}
                </div>
                <div>
                    <div class="flex items-center gap-1.5">
                        <h3 class="font-extrabold text-slate-800 text-sm">${currentUser.name} 님</h3>
                        <span class="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">사회초년생</span>
                    </div>
                    <p class="text-xs text-slate-400">${currentUser.email}</p>
                </div>
            </div>
            <button onclick="handleLogout()" class="text-xs text-slate-400 hover:text-rose-500 font-semibold underline">
                로그아웃
            </button>
        `;
        lockCard.classList.add('hidden');
        switchMypageTab(currentMypageTab || 'history');
    } else {
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-base">
                    <svg class="fa-ico" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"></path></svg>
                </div>
                <div>
                    <h3 class="font-bold text-slate-800 text-xs">비회원 이용 중</h3>
                    <p class="text-[11px] text-slate-400">로그인하여 내 계산 데이터 및 비교기능을 활용하세요.</p>
                </div>
            </div>
            <button onclick="openAuthModal('login')" class="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs active-tap">
                로그인
            </button>
        `;
        lockCard.classList.remove('hidden');
        historyArea.classList.add('hidden');
        compareArea.classList.add('hidden');
    }
    renderHistoryList();
}

function switchMypageTab(tab) {
    currentMypageTab = tab;
    
    if (!currentUser) {
        openAuthModal('login');
        return;
    }

    if(tab === 'history') {
        document.getElementById('area-mypage-history').classList.remove('hidden');
        document.getElementById('area-mypage-compare').classList.add('hidden');
        document.getElementById('mypage-tab-btn-history').className = 'flex-1 py-2 rounded-lg bg-white text-indigo-700 shadow-sm transition-all';
        document.getElementById('mypage-tab-btn-compare').className = 'flex-1 py-2 rounded-lg text-slate-600 transition-all';
    } else {
        document.getElementById('area-mypage-history').classList.add('hidden');
        document.getElementById('area-mypage-compare').classList.remove('hidden');
        document.getElementById('mypage-tab-btn-history').className = 'flex-1 py-2 rounded-lg text-slate-600 transition-all';
        document.getElementById('mypage-tab-btn-compare').className = 'flex-1 py-2 rounded-lg bg-white text-purple-700 shadow-sm transition-all';
        calcCompare();
    }
}

function switchSavingsTab(tab) {
    if(tab === 'deposit') {
        document.getElementById('area-deposit-form').classList.remove('hidden');
        document.getElementById('area-savings-form').classList.add('hidden');
        document.getElementById('tab-btn-deposit').className = 'flex-1 py-2 rounded-lg bg-white text-indigo-700 shadow-sm transition-all';
        document.getElementById('tab-btn-savings').className = 'flex-1 py-2 rounded-lg text-slate-600 transition-all';
    } else {
        document.getElementById('area-deposit-form').classList.add('hidden');
        document.getElementById('area-savings-form').classList.remove('hidden');
        document.getElementById('tab-btn-deposit').className = 'flex-1 py-2 rounded-lg text-slate-600 transition-all';
        document.getElementById('tab-btn-savings').className = 'flex-1 py-2 rounded-lg bg-white text-emerald-700 shadow-sm transition-all';
    }
}

// ---- 기간 선택 칩 (1/3/6/12/24/36개월 + 직접 입력)
const PERIOD_PRESETS = [1, 3, 6, 12, 24, 36];
const PERIOD_ACTIVE = {
    dep:  'bg-indigo-600 text-white border-indigo-600',
    sav:  'bg-emerald-600 text-white border-emerald-600',
    loan: 'bg-amber-500 text-white border-amber-500',
    ec: 'bg-amber-500 text-white border-amber-500'
};
const PERIOD_IDLE = 'bg-white text-slate-600 border-slate-200';
const periodState = {};

function renderPeriodChips(p) {
    const wrap = document.getElementById(`${p}-period-chips`);
    const sel = periodState[p];
    const chip = (key, label) => {
        const cls = sel === key ? PERIOD_ACTIVE[p] : PERIOD_IDLE;
        return `<button type="button" onclick="selectPeriod('${p}', '${key}')" class="px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active-tap ${cls}">${label}</button>`;
    };
    wrap.innerHTML = PERIOD_PRESETS.map(m => chip(String(m), `${m}개월`)).join('') + chip('custom', '직접 입력');
}

function selectPeriod(p, key) {
    const input = document.getElementById(`${p}-period`);
    const customWrap = document.getElementById(`${p}-period-custom-wrap`);
    periodState[p] = key;
    if (key === 'custom') {
        customWrap.classList.remove('hidden');
        input.focus();
        input.select();
    } else {
        customWrap.classList.add('hidden');
        input.value = key;
    }
    if (p === 'ec') clampEarlyElapsed();
    renderPeriodChips(p);
}

function clampEarlyRate() {
    const normalRateInput = document.getElementById('ec-rate');
    const earlyRateInput = document.getElementById('ec-early-rate');
    if (!normalRateInput || !earlyRateInput || normalRateInput.value === '') return;
    const maxRate = Math.max(0, Number(normalRateInput.value) || 0);
    earlyRateInput.max = String(maxRate);
    if (earlyRateInput.value !== '' && Number(earlyRateInput.value) > maxRate) {
        earlyRateInput.value = String(maxRate);
    }
}

function clampEarlyElapsed() {
    const termInput = document.getElementById('ec-period');
    const elapsedInput = document.getElementById('ec-elapsed');
    if (!termInput || !elapsedInput) return;
    const term = Math.max(1, Math.round(parseFloat(termInput.value) || 1));
    const maxElapsed = Math.max(0, term - 1);
    elapsedInput.max = String(maxElapsed);
    elapsedInput.min = '0';
    elapsedInput.step = '1';
    const elapsed = Math.max(0, Math.round(parseFloat(elapsedInput.value) || 0));
    if (elapsed > maxElapsed) elapsedInput.value = String(maxElapsed);
}

function initPeriodPicker(p) {
    const v = String(parseInt(document.getElementById(`${p}-period`).value, 10));
    periodState[p] = PERIOD_PRESETS.map(String).includes(v) ? v : '12';
    if (periodState[p] !== v) document.getElementById(`${p}-period`).value = periodState[p];
    renderPeriodChips(p);
    if (p === 'ec') {
        const termInput = document.getElementById('ec-period');
        const normalRateInput = document.getElementById('ec-rate');
        termInput.addEventListener('input', clampEarlyElapsed);
        normalRateInput.addEventListener('input', clampEarlyRate);
        clampEarlyElapsed();
        clampEarlyRate();
    }
}

function readMonths(id) {
    return Math.max(1, Math.round(parseFloat(document.getElementById(id).value) || 0));
}

function clampRate(el, max) {
    const v = parseFloat(el.value);
    if (!isNaN(v) && v > max) el.value = max;
    if (!isNaN(v) && v < 0) el.value = 0;
}

function toggleBox(boxId, iconId) {
    const box = document.getElementById(boxId);
    const icon = document.getElementById(iconId);
    const open = box.classList.toggle('hidden') === false;
    icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
}

function calcDeposit() {
    const amt = parseFloat(document.getElementById('dep-amount').value) || 0;
    const months = readMonths('dep-period');
    const rate = (parseFloat(document.getElementById('dep-rate').value) || 0) / 100;
    const gross = amt * rate * (months / 12);
    const net = gross * (1 - 0.154);
    document.getElementById('dep-res-total').textContent = `${formatNum(amt + net)}원`;
    document.getElementById('dep-res-gross').textContent = `+${formatNum(gross)}원`;
    document.getElementById('dep-res-tax').textContent = `-${formatNum(gross * 0.154)}원`;
}

function calcSavings() {
    const amt = parseFloat(document.getElementById('sav-amount').value) || 0;
    const months = readMonths('sav-period');
    const rate = (parseFloat(document.getElementById('sav-rate').value) || 0) / 100;
    const principal = amt * months;
    const gross = amt * (rate / 12) * (months * (months + 1) / 2);
    const net = gross * (1 - 0.154);
    document.getElementById('sav-res-total').textContent = `${formatNum(principal + net)}원`;
    document.getElementById('sav-res-principal').textContent = `${formatNum(principal)}원`;
    document.getElementById('sav-res-net').textContent = `+${formatNum(net)}원`;
}

function calcLoan() {
    const amt = parseFloat(document.getElementById('loan-amount').value) || 0;
    const months = readMonths('loan-period');
    const rate = Math.min(20, Math.max(0, parseFloat(document.getElementById('loan-rate').value) || 0)) / 100;
    const type = document.getElementById('loan-type').value;
    const r = rate / 12;
    let monthly, totalInterest, detail;

    if (type === 'equal-principal') {
        // 원금균등: 매달 원금(amt/n) + 남은 원금에 대한 이자
        const principalPart = amt / months;
        const first = principalPart + amt * r;
        const last = principalPart + (amt / months) * r;
        totalInterest = amt * r * (months + 1) / 2;
        monthly = (amt + totalInterest) / months;
        detail = `첫 달 ${formatNum(first)}원 → 마지막 달 ${formatNum(last)}원`;
    } else if (type === 'bullet') {
        // 만기일시: 매달 이자만, 만기에 원금 상환
        const monthlyInterest = amt * r;
        totalInterest = monthlyInterest * months;
        monthly = (amt + totalInterest) / months;
        detail = `매달 이자 ${formatNum(monthlyInterest)}원, 만기에 원금 ${formatNum(amt)}원`;
    } else {
        // 원리금균등
        monthly = r === 0 ? amt / months : amt * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
        totalInterest = monthly * months - amt;
        detail = '매달 동일';
    }

    document.getElementById('loan-res-monthly').textContent = `${formatNum(monthly)}원`;
    document.getElementById('loan-res-detail').textContent = detail;
    document.getElementById('loan-res-principal').textContent = `${formatNum(amt)}원`;
    document.getElementById('loan-res-total-interest').textContent = `${formatNum(totalInterest)}원`;
}

function calcCompare() {
    const keys=['a','b','c','d','e']; const palette=['#6366f1','#9333ea','#10b981','#f59e0b','#ec4899'];
    const rows=keys.map((k,i)=>({key:k,label:`조건 ${k.toUpperCase()}`,amount:Math.max(0,Number(document.getElementById(`cmp-${k}-amt`).value)||0),rate:Math.max(0,Number(document.getElementById(`cmp-${k}-rate`).value)||0)})).filter(x=>x.amount>0);
    const results=rows.map(x=>({...x,net:x.amount*x.rate/100*(1-0.154)}));
    const max=Math.max(...results.map(x=>x.net),1);
    document.getElementById('cmp-results').innerHTML=results.map(x=>`<div class="rounded-xl border p-3"><div class="flex justify-between text-xs"><span class="font-semibold">${x.label} · 연 ${x.rate}%</span><b>${formatNum(x.net)}원</b></div><div class="mt-2 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${Math.max(2,x.net/max*100)}%;background:${palette[keys.indexOf(x.key)]}"></div></div><p class="text-[10px] text-slate-400 mt-1">예치금 ${formatNum(x.amount)}원 · 세후 이자 예상</p></div>`).join('');
    if(results.length<2){document.getElementById('cmp-summary-box').textContent='비교하려면 조건을 2개 이상 입력하세요.';return;}
    const best=results.reduce((a,b)=>a.net>b.net?a:b), worst=results.reduce((a,b)=>a.net<b.net?a:b);
    document.getElementById('cmp-summary-box').textContent=`${best.label}이(가) 세후 이자 ${formatNum(best.net-worst.net)}원 더 유리합니다. (입력 조건 기준)`;
}
function calcEarlyCancel() {
    const principal=Math.max(0,Number(document.getElementById('ec-amount').value)||0), term=readMonths('ec-period'), elapsed=Math.min(term,Math.max(0,Number(document.getElementById('ec-elapsed').value)||0)), normal=Math.max(0,Number(document.getElementById('ec-rate').value)||0)/100, early=Math.max(0,Number(document.getElementById('ec-early-rate').value)||0)/100;
    const maturityNet=principal*normal*(term/12)*(1-0.154), earlyNet=principal*early*(elapsed/12)*(1-0.154), loss=Math.max(0,maturityNet-earlyNet), result=document.getElementById('ec-result'); result.classList.remove('hidden');
    result.innerHTML=`<h3 class="font-bold">예상 결과 · 세후 단리 근사</h3><div class="grid grid-cols-2 gap-2"><div class="bg-amber-50 rounded-xl p-3"><p class="text-[10px] text-slate-500">지금 해지</p><p class="font-extrabold text-amber-700">${formatNum(principal+earlyNet)}원</p><p class="text-[10px]">세후 이자 ${formatNum(earlyNet)}원</p></div><div class="bg-emerald-50 rounded-xl p-3"><p class="text-[10px] text-slate-500">만기 유지</p><p class="font-extrabold text-emerald-700">${formatNum(principal+maturityNet)}원</p><p class="text-[10px]">세후 이자 ${formatNum(maturityNet)}원</p></div></div><div class="bg-slate-100 rounded-xl p-3 text-center"><p class="text-xs text-slate-500">만기 유지 시 더 받을 수 있는 예상 이자</p><p class="text-lg font-extrabold text-indigo-700">${formatNum(loss)}원</p></div>`;
}

function saveCurrentResult(type) {
    const list = getHistory();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    let item = { id: Date.now(), date: dateStr, type };

    if (type === 'deposit') {
        item.title = '예금 계산';
        item.amount = document.getElementById('dep-res-total').textContent;
        item.sub = `원금 ${formatNum(document.getElementById('dep-amount').value)}원`;
    } else if (type === 'savings') {
        item.title = '적금 계산';
        item.amount = document.getElementById('sav-res-total').textContent;
        item.sub = `월 ${formatNum(document.getElementById('sav-amount').value)}원`;
    } else {
        item.title = '대출 계산';
        item.amount = `월 ${document.getElementById('loan-res-monthly').textContent}`;
        item.sub = `대출금 ${formatNum(document.getElementById('loan-amount').value)}원`;
    }

    list.unshift(item);
    saveHistoryData(list);
    sheetLog(SHEET_HISTORY, {
        id: item.id, date: item.date, type: item.type, title: item.title,
        amount: item.amount, sub: item.sub,
        name: currentUser ? currentUser.name : '비회원',
        email: currentUser ? currentUser.email : '비회원'
    });
    showToast('마이페이지 기록에 저장되었습니다!');
}

function clearHistory() {
    saveHistoryData([]);
    renderHistoryList();
    renderHomeRecent();
    showToast('기록이 전체 삭제되었습니다.');
}

function deleteHistoryItem(id) {
    const list = getHistory();
    const updatedList = list.filter(item => String(item.id) !== String(id));
    if (updatedList.length === list.length) return;
    saveHistoryData(updatedList);
    renderHistoryList();
    renderHomeRecent();
    showToast('선택한 계산 기록이 삭제되었습니다.');
}

function renderHistoryList() {
    const container = document.getElementById('history-container');
    const list = getHistory();
    if(list.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-xs text-slate-400 bg-white rounded-xl">저장된 기록이 없습니다.</div>`;
        return;
    }
    container.innerHTML = list.map(item => `
        <div class="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm text-xs">
            <div class="min-w-0">
                <div class="font-bold text-slate-800">${item.title} <span class="text-[10px] text-slate-400 font-normal">(${item.date})</span></div>
                <div class="font-black text-indigo-900 text-sm mt-0.5">${item.amount}</div>
                <div class="text-[10px] text-slate-400">${item.sub}</div>
            </div>
            <button type="button" onclick="deleteHistoryItem('${String(item.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" class="shrink-0 px-2.5 py-1.5 rounded-lg border border-rose-100 text-rose-500 font-semibold hover:bg-rose-50 active-tap" aria-label="${item.title} 기록 삭제">삭제</button>
        </div>
    `).join('');
}

function renderHomeRecent() {
    const container = document.getElementById('home-recent-list');
    const viewAllBtn = document.getElementById('home-view-all-btn');
    
    if (!currentUser) {
        if (viewAllBtn) viewAllBtn.classList.add('hidden');
        container.innerHTML = `
            <!-- Interactive Sample Preview Card for Non-Logged Users -->
            <div class="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-md border border-indigo-500/30 space-y-3 relative overflow-hidden">
                
                <!-- Sample Item 1: After-Tax Return -->
                <div class="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold">
                            <svg class="fa-ico" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true"><path d="M64 0C28.7 0 0 28.7 0 64L0 416c0 35.3 28.7 64 64 64l16 0 16 32 64 0 16-32 224 0 16 32 64 0 16-32 16 0c35.3 0 64-28.7 64-64l0-352c0-35.3-28.7-64-64-64L64 0zM224 320a80 80 0 1 0 0-160 80 80 0 1 0 0 160zm0-240a160 160 0 1 1 0 320 160 160 0 1 1 0-320zM480 221.3L480 336c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-114.7c-18.6-6.6-32-24.4-32-45.3c0-26.5 21.5-48 48-48s48 21.5 48 48c0 20.9-13.4 38.7-32 45.3z"></path></svg>
                        </div>
                        <div>
                            <span class="text-[10px] text-indigo-200 block">정기예금 (원금 1,000만원 · 12개월)</span>
                            <div class="text-xs font-black text-white">세후 실수령액 <span class="text-emerald-400">10,296,100원</span></div>
                        </div>
                    </div>
                    <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">이자 +29.6만</span>
                </div>

                <!-- Sample Item 2: Comparison Example -->
                <div class="bg-purple-950/50 p-3 rounded-xl border border-purple-400/30 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-purple-500/30 text-purple-300 flex items-center justify-center text-xs font-bold">
                            <svg class="fa-ico" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M320 488c0 9.5-5.6 18.1-14.2 21.9s-18.8 2.3-25.8-4.1l-80-72c-5.1-4.6-7.9-11-7.9-17.8s2.9-13.3 7.9-17.8l80-72c7-6.3 17.2-7.9 25.8-4.1s14.2 12.4 14.2 21.9l0 40 16 0c35.3 0 64-28.7 64-64l0-166.7C371.7 141 352 112.8 352 80c0-44.2 35.8-80 80-80s80 35.8 80 80c0 32.8-19.7 61-48 73.3L464 320c0 70.7-57.3 128-128 128l-16 0 0 40zM456 80a24 24 0 1 0 -48 0 24 24 0 1 0 48 0zM192 24c0-9.5 5.6-18.1 14.2-21.9s18.8-2.3 25.8 4.1l80 72c5.1 4.6 7.9 11 7.9 17.8s-2.9 13.3-7.9 17.8l-80 72c-7 6.3-17.2 7.9-25.8 4.1s-14.2-12.4-14.2-21.9l0-40-16 0c-35.3 0-64 28.7-64 64l0 166.7c28.3 12.3 48 40.5 48 73.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-32.8 19.7-61 48-73.3L48 192c0-70.7 57.3-128 128-128l16 0 0-40zM56 432a24 24 0 1 0 48 0 24 24 0 1 0 -48 0z"></path></svg>
                        </div>
                        <div>
                            <span class="text-[10px] text-purple-200 block">조건 A(3.5%) vs 조건 B(4.0%) 비교</span>
                            <div class="text-xs font-black text-amber-300">조건 B가 세후 +42,300원 더 유리!</div>
                        </div>
                    </div>
                    <svg class="fa-ico text-purple-300 text-xs" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true"><path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"></path></svg>
                </div>

                <button onclick="openAuthModal('login')" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition-all active-tap shadow-sm flex items-center justify-center gap-1.5 mt-1">
                    <svg class="fa-ico" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M217.9 105.9L340.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L217.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1L32 320c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM352 416l64 0c17.7 0 32-14.3 32-32l0-256c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c53 0 96 43 96 96l0 256c0 53-43 96-96 96l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z"></path></svg> 로그인하고 내 실시간 저장기능 시작하기
                </button>
            </div>
        `;
        return;
    }

    if (viewAllBtn) viewAllBtn.classList.remove('hidden');

    const list = getHistory().slice(0, 2);
    if(list.length === 0) {
        container.innerHTML = `<div class="text-center py-3 text-xs text-slate-400 bg-white rounded-xl">저장 내역이 없습니다.</div>`;
        return;
    }
    container.innerHTML = list.map(item => `
        <div onclick="navTo('mypage')" class="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs cursor-pointer">
            <div>
                <span class="text-[10px] text-slate-400">${item.title}</span>
                <div class="font-bold text-slate-800">${item.amount}</div>
            </div>
            <svg class="fa-ico text-slate-300 text-xs" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true"><path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"></path></svg>
        </div>
    `).join('');
}

window.onload = function() {
    updateHeaderAuthUI();
    renderHomeRecent();
    ['dep', 'sav', 'loan', 'ec'].forEach(initPeriodPicker);

    // 금액 입력란 한글 단위 실시간 바인딩
    bindKoreanAmountHint('dep-amount', 'dep-amount-ko');
    bindKoreanAmountHint('ec-amount', 'ec-amount-ko');
    bindKoreanAmountHint('sav-amount', 'sav-amount-ko');
    bindKoreanAmountHint('loan-amount', 'loan-amount-ko');
    bindKoreanAmountHint('cmp-a-amt', 'cmp-a-amt-ko');
    bindKoreanAmountHint('cmp-b-amt', 'cmp-b-amt-ko');

    calcDeposit();
    calcSavings();
    calcLoan();
};
