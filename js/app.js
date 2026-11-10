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

function navTo(screenId) {
    currentScreen = screenId;
    document.querySelectorAll('.page-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenId}`).classList.add('active');

    const titles = { 'home':'금융 계산기', 'savings':'저축 계산', 'loan':'대출 계산', 'mypage':'마이페이지 & 내 기록' };
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
        showToast(`${matchedUser.name}님, 환영합니다!`);
        closeAuthModal();
        updateHeaderAuthUI();
        renderHomeRecent();
        if (currentScreen === 'mypage') renderMypage();
    }
}

function handleLogout() {
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
                    <i class="fa-solid fa-user"></i>
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

function calcDeposit() {
    const amt = parseFloat(document.getElementById('dep-amount').value) || 0;
    const months = parseFloat(document.getElementById('dep-period').value) || 0;
    const rate = (parseFloat(document.getElementById('dep-rate').value) || 0) / 100;
    const gross = amt * rate * (months / 12);
    const net = gross * (1 - 0.154);
    document.getElementById('dep-res-total').textContent = `${formatNum(amt + net)}원`;
    document.getElementById('dep-res-gross').textContent = `+${formatNum(gross)}원`;
    document.getElementById('dep-res-tax').textContent = `-${formatNum(gross * 0.154)}원`;
}

function calcSavings() {
    const amt = parseFloat(document.getElementById('sav-amount').value) || 0;
    const months = parseFloat(document.getElementById('sav-period').value) || 0;
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
    const months = parseFloat(document.getElementById('loan-period').value) || 0;
    const rate = (parseFloat(document.getElementById('loan-rate').value) || 0) / 100;
    const r = rate / 12;
    const monthly = amt * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    const totalPaid = monthly * months;
    document.getElementById('loan-res-monthly').textContent = `${formatNum(monthly)}원`;
    document.getElementById('loan-res-principal').textContent = `${formatNum(amt)}원`;
    document.getElementById('loan-res-total-interest').textContent = `${formatNum(totalPaid - amt)}원`;
}

function calcCompare() {
    const amtA = parseFloat(document.getElementById('cmp-a-amt').value) || 0;
    const rateA = (parseFloat(document.getElementById('cmp-a-rate').value) || 0) / 100;
    const netA = amtA * rateA * (1 - 0.154);

    const amtB = parseFloat(document.getElementById('cmp-b-amt').value) || 0;
    const rateB = (parseFloat(document.getElementById('cmp-b-rate').value) || 0) / 100;
    const netB = amtB * rateB * (1 - 0.154);

    document.getElementById('cmp-chart-a-val').textContent = `${formatNum(netA)}원`;
    document.getElementById('cmp-chart-b-val').textContent = `${formatNum(netB)}원`;

    const max = Math.max(netA, netB, 1);
    document.getElementById('cmp-chart-a-bar').style.width = `${(netA/max)*100}%`;
    document.getElementById('cmp-chart-b-bar').style.width = `${(netB/max)*100}%`;

    const diff = Math.abs(netA - netB);
    document.getElementById('cmp-summary-box').textContent = netB >= netA 
        ? `조건 B가 세후 ${formatNum(diff)}원 더 유리합니다!`
        : `조건 A가 세후 ${formatNum(diff)}원 더 유리합니다!`;
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
    showToast('마이페이지 기록에 저장되었습니다!');
}

function clearHistory() {
    saveHistoryData([]);
    renderHistoryList();
    renderHomeRecent();
    showToast('기록이 전체 삭제되었습니다.');
}

function renderHistoryList() {
    const container = document.getElementById('history-container');
    const list = getHistory();
    if(list.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-xs text-slate-400 bg-white rounded-xl">저장된 기록이 없습니다.</div>`;
        return;
    }
    container.innerHTML = list.map(item => `
        <div class="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm text-xs">
            <div>
                <div class="font-bold text-slate-800">${item.title} <span class="text-[10px] text-slate-400 font-normal">(${item.date})</span></div>
                <div class="font-black text-indigo-900 text-sm mt-0.5">${item.amount}</div>
                <div class="text-[10px] text-slate-400">${item.sub}</div>
            </div>
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
                            <i class="fa-solid fa-vault"></i>
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
                            <i class="fa-solid fa-code-compare"></i>
                        </div>
                        <div>
                            <span class="text-[10px] text-purple-200 block">조건 A(3.5%) vs 조건 B(4.0%) 비교</span>
                            <div class="text-xs font-black text-amber-300">조건 B가 세후 +42,300원 더 유리!</div>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-purple-300 text-xs"></i>
                </div>

                <button onclick="openAuthModal('login')" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition-all active-tap shadow-sm flex items-center justify-center gap-1.5 mt-1">
                    <i class="fa-solid fa-right-to-bracket"></i> 로그인하고 내 실시간 저장기능 시작하기
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
            <i class="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
        </div>
    `).join('');
}

window.onload = function() {
    updateHeaderAuthUI();
    renderHomeRecent();
    calcDeposit();
    calcSavings();
    calcLoan();
};
