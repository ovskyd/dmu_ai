// Global State & Navigation History Stack
let currentScreen = 'home';
let navHistory = ['home'];
let activeHistoryFilter = 'all';

// Sample initial history data if empty
const initialMockHistory = [
    { id: 1, type: 'deposit', title: '예금 계산', date: '2026.11.03', amount: '10,296,100원', sub: '원금 1,000만원 · 연 3.5%' },
    { id: 2, type: 'savings', title: '적금 계산', date: '2026.11.02', amount: '3,665,988원', sub: '월 30만원 · 연 4.0%' },
    { id: 3, type: 'loan', title: '대출 계산', date: '2026.10.30', amount: '월 599,418원', sub: '2,000만원 · 원리금균등' }
];

// Initialize local storage
function getHistory() {
    const data = localStorage.getItem('fin_calc_history');
    return data ? JSON.parse(data) : initialMockHistory;
}

function saveHistoryData(data) {
    localStorage.setItem('fin_calc_history', JSON.stringify(data));
}

// Screen Titles Mapping
const screenTitles = {
    'home': '금융 계산기',
    'deposit': '예금 계산',
    'savings': '적금 계산',
    'loan': '대출 계산',
    'compare': '조건 비교',
    'history': '계산 기록'
};

// Navigation Handler
function navTo(screenId, pushHistory = true) {
    if (currentScreen === screenId) return;

    if (pushHistory) {
        navHistory.push(screenId);
    }

    currentScreen = screenId;

    // Update Page Visibility
    document.querySelectorAll('.page-screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Update App Header Title & Back Button
    document.getElementById('header-title').textContent = screenTitles[screenId] || '금융 계산기';
    const backBtn = document.getElementById('btn-back');
    if (screenId === 'home') {
        backBtn.classList.add('hidden');
    } else {
        backBtn.classList.remove('hidden');
    }

    // Update Bottom Nav Style
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('text-indigo-600');
        btn.classList.add('text-slate-400');
    });
    const activeNavBtn = document.getElementById(`nav-${screenId}`);
    if (activeNavBtn) {
        activeNavBtn.classList.remove('text-slate-400');
        activeNavBtn.classList.add('text-indigo-600');
    }

    // Run Screen Specific Renderers
    if (screenId === 'home') renderHomeRecent();
    if (screenId === 'history') renderHistoryList();
    if (screenId === 'deposit') calcDeposit();
    if (screenId === 'savings') calcSavings();
    if (screenId === 'loan') calcLoan();
    if (screenId === 'compare') calcCompare();
}

function goBack() {
    if (navHistory.length > 1) {
        navHistory.pop();
        const previous = navHistory[navHistory.length - 1];
        navTo(previous, false);
    } else {
        navTo('home', false);
    }
}

// Toast Message Notification
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}

// Helper: Number Formatter
function formatNum(num) {
    return Math.round(num).toLocaleString('ko-KR');
}

// Helper: Input Modifier
function addValue(inputId, addAmt) {
    const el = document.getElementById(inputId);
    const current = parseFloat(el.value) || 0;
    el.value = current + addAmt;
}

// ================= FINANCIAL CALCULATIONS ================= //

// 1. Deposit Calculation Logic
function calcDeposit() {
    const amount = parseFloat(document.getElementById('dep-amount').value) || 0;
    const months = parseFloat(document.getElementById('dep-period').value) || 0;
    const annualRate = (parseFloat(document.getElementById('dep-rate').value) || 0) / 100;
    const isCompound = document.getElementById('dep-type').value === 'compound';
    const taxRate = parseFloat(document.getElementById('dep-tax').value) / 100;

    let grossInterest = 0;

    if (!isCompound) {
        // Simple interest formula
        grossInterest = amount * annualRate * (months / 12);
    } else {
        // Monthly compound formula
        const monthlyRate = annualRate / 12;
        grossInterest = amount * (Math.pow(1 + monthlyRate, months) - 1);
    }

    const taxAmount = grossInterest * taxRate;
    const netInterest = grossInterest - taxAmount;
    const totalPayout = amount + netInterest;

    // Update UI
    document.getElementById('dep-res-total').textContent = `${formatNum(totalPayout)}원`;
    document.getElementById('dep-res-principal').textContent = `${formatNum(amount)}원`;
    document.getElementById('dep-res-gross').textContent = `+${formatNum(grossInterest)}원`;
    document.getElementById('dep-res-tax').textContent = `-${formatNum(taxAmount)}원`;
    document.getElementById('dep-res-net').textContent = `+${formatNum(netInterest)}원`;

    const taxLabel = taxRate === 0 ? '비과세' : (taxRate === 0.095 ? '세금우대' : '일반과세');
    const typeLabel = isCompound ? '월복리' : '단리';
    document.getElementById('dep-res-summary').textContent = `${months}개월 · ${annualRate * 100}% · ${typeLabel} · ${taxLabel}`;
}

// 2. Savings Calculation Logic
function calcSavings() {
    const monthlyAmt = parseFloat(document.getElementById('sav-amount').value) || 0;
    const months = parseFloat(document.getElementById('sav-period').value) || 0;
    const annualRate = (parseFloat(document.getElementById('sav-rate').value) || 0) / 100;
    const taxRate = parseFloat(document.getElementById('sav-tax').value) / 100;

    const totalPrincipal = monthlyAmt * months;
    
    // Standard savings interest: S = P * r * n(n+1)/(2*12)
    const grossInterest = monthlyAmt * (annualRate / 12) * (months * (months + 1) / 2);
    const taxAmount = grossInterest * taxRate;
    const netInterest = grossInterest - taxAmount;
    const totalPayout = totalPrincipal + netInterest;

    document.getElementById('sav-res-total').textContent = `${formatNum(totalPayout)}원`;
    document.getElementById('sav-res-principal').textContent = `${formatNum(totalPrincipal)}원`;
    document.getElementById('sav-res-gross').textContent = `+${formatNum(grossInterest)}원`;
    document.getElementById('sav-res-tax').textContent = `-${formatNum(taxAmount)}원`;
    document.getElementById('sav-res-net').textContent = `+${formatNum(netInterest)}원`;
}

// 3. Loan Calculation Logic
function calcLoan() {
    const principal = parseFloat(document.getElementById('loan-amount').value) || 0;
    const months = parseFloat(document.getElementById('loan-period').value) || 0;
    const annualRate = (parseFloat(document.getElementById('loan-rate').value) || 0) / 100;
    const type = document.getElementById('loan-type').value;

    const monthlyRate = annualRate / 12;
    let monthlyPaymentAvg = 0;
    let totalInterest = 0;

    if (type === 'equal-principal-interest') {
        // 원리금균등
        if (monthlyRate > 0) {
            monthlyPaymentAvg = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        } else {
            monthlyPaymentAvg = principal / months;
        }
        const totalPaid = monthlyPaymentAvg * months;
        totalInterest = totalPaid - principal;
        document.getElementById('loan-res-type-desc').textContent = '원리금균등상환 기준 (매월 동일)';
    } else if (type === 'equal-principal') {
        // 원금균등
        const principalPerMonth = principal / months;
        totalInterest = 0;
        for (let i = 0; i < months; i++) {
            const remaining = principal - (principalPerMonth * i);
            totalInterest += remaining * monthlyRate;
        }
        monthlyPaymentAvg = (principal + totalInterest) / months;
        document.getElementById('loan-res-type-desc').textContent = '원금균등상환 기준 (월평균 상환액)';
    } else {
        // 만기일시
        totalInterest = principal * annualRate * (months / 12);
        monthlyPaymentAvg = (totalInterest / months);
        document.getElementById('loan-res-type-desc').textContent = '만기일시상환 기준 (매월 이자만 납입)';
    }

    const totalPayment = principal + totalInterest;

    document.getElementById('loan-res-monthly').textContent = `${formatNum(monthlyPaymentAvg)}원`;
    document.getElementById('loan-res-principal').textContent = `${formatNum(principal)}원`;
    document.getElementById('loan-res-total-interest').textContent = `${formatNum(totalInterest)}원`;
    document.getElementById('loan-res-total-payment').textContent = `${formatNum(totalPayment)}원`;
}

// 4. Comparison Calculation Logic
function calcCompare() {
    const amtA = parseFloat(document.getElementById('cmp-a-amt').value) || 0;
    const rateA = (parseFloat(document.getElementById('cmp-a-rate').value) || 0) / 100;
    const monthsA = parseFloat(document.getElementById('cmp-a-months').value) || 0;

    const amtB = parseFloat(document.getElementById('cmp-b-amt').value) || 0;
    const rateB = (parseFloat(document.getElementById('cmp-b-rate').value) || 0) / 100;
    const monthsB = parseFloat(document.getElementById('cmp-b-months').value) || 0;

    // Simple deposit comparison with 15.4% standard tax
    const grossA = amtA * rateA * (monthsA / 12);
    const netA = grossA * (1 - 0.154);
    const totalA = amtA + netA;

    const grossB = amtB * rateB * (monthsB / 12);
    const netB = grossB * (1 - 0.154);
    const totalB = amtB + netB;

    document.getElementById('cmp-res-a-net').textContent = `${formatNum(netA)}원`;
    document.getElementById('cmp-res-a-total').textContent = `${formatNum(totalA)}원`;

    document.getElementById('cmp-res-b-net').textContent = `${formatNum(netB)}원`;
    document.getElementById('cmp-res-b-total').textContent = `${formatNum(totalB)}원`;

    const diffNet = Math.abs(netA - netB);
    const titleEl = document.getElementById('cmp-summary-title');
    const descEl = document.getElementById('cmp-summary-desc');

    if (netB > netA) {
        titleEl.textContent = `조건 B가 세후 ${formatNum(diffNet)}원 더 유리합니다!`;
        descEl.textContent = `동일한 조건 비교 결과, 조건 B를 선택할 때 이자 수익이 더 높게 나타납니다.`;
    } else if (netA > netB) {
        titleEl.textContent = `조건 A가 세후 ${formatNum(diffNet)}원 더 유리합니다!`;
        descEl.textContent = `동일한 조건 비교 결과, 조건 A를 선택할 때 이자 수익이 더 높게 나타납니다.`;
    } else {
        titleEl.textContent = `두 조건의 예상 수익이 동일합니다.`;
        descEl.textContent = `두 조건 모두 동일한 세후 이자 수익을 제공합니다.`;
    }
}

// ================= SAVE & HISTORY SYSTEM ================= //

function saveCurrentResult(type) {
    const list = getHistory();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    let newItem = {};

    if (type === 'deposit') {
        const total = document.getElementById('dep-res-total').textContent;
        const amount = document.getElementById('dep-amount').value;
        const rate = document.getElementById('dep-rate').value;
        newItem = {
            id: Date.now(),
            type: 'deposit',
            title: '예금 계산',
            date: dateStr,
            amount: total,
            sub: `원금 ${formatNum(amount)}원 · 연 ${rate}%`
        };
    } else if (type === 'savings') {
        const total = document.getElementById('sav-res-total').textContent;
        const amount = document.getElementById('sav-amount').value;
        const rate = document.getElementById('sav-rate').value;
        newItem = {
            id: Date.now(),
            type: 'savings',
            title: '적금 계산',
            date: dateStr,
            amount: total,
            sub: `월 ${formatNum(amount)}원 · 연 ${rate}%`
        };
    } else if (type === 'loan') {
        const monthly = document.getElementById('loan-res-monthly').textContent;
        const amount = document.getElementById('loan-amount').value;
        newItem = {
            id: Date.now(),
            type: 'loan',
            title: '대출 계산',
            date: dateStr,
            amount: `월 ${monthly}`,
            sub: `대출 ${formatNum(amount)}원 · 원리금균등`
        };
    }

    list.unshift(newItem);
    saveHistoryData(list);
    showToast('계산 결과가 기록에 저장되었습니다!');
}

function deleteHistoryItem(id) {
    let list = getHistory();
    list = list.filter(item => item.id !== id);
    saveHistoryData(list);
    renderHistoryList();
    renderHomeRecent();
    showToast('기록이 삭제되었습니다.');
}

function clearHistory() {
    saveHistoryData([]);
    renderHistoryList();
    renderHomeRecent();
    showToast('전체 기록이 삭제되었습니다.');
}

function filterHistory(category) {
    activeHistoryFilter = category;
    document.querySelectorAll('.hist-filter-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white', 'font-bold');
        btn.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
    });
    const activeBtn = document.getElementById(`hist-filter-${category}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'font-bold');
    }
    renderHistoryList();
}

function renderHistoryList() {
    const container = document.getElementById('history-container');
    let list = getHistory();

    if (activeHistoryFilter !== 'all') {
        list = list.filter(item => item.type === activeHistoryFilter);
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100">
                <i class="fa-regular fa-folder-open text-3xl mb-2 opacity-50"></i>
                <p class="text-xs">저장된 계산 기록이 없습니다.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(item => {
        const iconMap = {
            deposit: { icon: 'fa-vault', color: 'bg-indigo-50 text-indigo-600' },
            savings: { icon: 'fa-piggy-bank', color: 'bg-emerald-50 text-emerald-600' },
            loan: { icon: 'fa-hand-holding-dollar', color: 'bg-amber-50 text-amber-600' }
        };
        const style = iconMap[item.type] || iconMap.deposit;

        return `
            <div class="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${style.color} flex items-center justify-center text-lg font-bold">
                        <i class="fa-solid ${style.icon}"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-xs text-slate-800">${item.title}</span>
                            <span class="text-[10px] text-slate-400">${item.date}</span>
                        </div>
                        <div class="text-sm font-black text-slate-900 mt-0.5">${item.amount}</div>
                        <div class="text-[10px] text-slate-400">${item.sub}</div>
                    </div>
                </div>
                <button onclick="deleteHistoryItem(${item.id})" class="text-slate-300 hover:text-rose-500 p-2 text-sm transition-colors">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    }).join('');
}

function renderHomeRecent() {
    const container = document.getElementById('home-recent-list');
    const list = getHistory().slice(0, 2); // Show top 2

    if (list.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-slate-400 bg-white rounded-xl text-xs border border-slate-100">
                최근 저장 내역이 없습니다.
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(item => {
        const iconMap = {
            deposit: { icon: 'fa-vault', color: 'bg-indigo-50 text-indigo-600' },
            savings: { icon: 'fa-piggy-bank', color: 'bg-emerald-50 text-emerald-600' },
            loan: { icon: 'fa-hand-holding-dollar', color: 'bg-amber-50 text-amber-600' }
        };
        const style = iconMap[item.type] || iconMap.deposit;

        return `
            <div onclick="navTo('${item.type}')" class="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg ${style.color} flex items-center justify-center text-sm font-bold">
                        <i class="fa-solid ${style.icon}"></i>
                    </div>
                    <div>
                        <div class="text-[10px] text-slate-400">${item.title} · ${item.date}</div>
                        <div class="text-xs font-bold text-slate-800">${item.amount}</div>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
            </div>
        `;
    }).join('');
}

// Real-time Clock Sync
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('current-time');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}`;
}

// Initialize App on Load
window.onload = function() {
    updateClock();
    setInterval(updateClock, 10000);
    renderHomeRecent();
    calcDeposit();
};
