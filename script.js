/**
 * AgriGuard AI — script.js
 * AI Diagnostic Tool + Live Dashboard Logic
 * ============================================
 */

/* ===================================================
   GLOBAL STATE
   =================================================== */
const state = {
    scanCount: 0,
    lastResult: null,
    fields: [
        { id: 'F-001', name: 'North Field A', crop: 'Wheat', health: 91, bacterial: 2.1, status: 'nominal' },
        { id: 'F-002', name: 'South Field B', crop: 'Corn', health: 74, bacterial: 18.4, status: 'warning' },
        { id: 'F-003', name: 'East Paddock', crop: 'Rice', health: 88, bacterial: 5.7, status: 'nominal' },
        { id: 'F-004', name: 'West Valley', crop: 'Soy', health: 45, bacterial: 61.0, status: 'critical' },
    ],
    history: [82, 78, 85, 89, 91, 87, 91],
};

/* ===================================================
   SAMPLE SCAN DATA
   =================================================== */
const SAMPLES = {
    healthy: {
        label: 'Healthy Wheat',
        color: '#22c55e',
        healthScore: 92,
        bacterialRiskPct: 1.8,
        bacterialRiskLevel: 'Low',
        riskColor: 'text-green-400',
        barColor: 'from-green-700 to-green-400',
        healthBarColor: 'from-forest-600 to-forest-400',
        signals: [
            { name: 'Chlorophyll Index', value: 'Normal', icon: '✅', color: 'text-green-400' },
            { name: 'Moisture Level', value: 'Optimal — 68%', icon: '✅', color: 'text-green-400' },
            { name: 'Bacterial Blight', value: 'Not detected', icon: '✅', color: 'text-green-400' },
            { name: 'Fungal Spores', value: 'Trace — 0.2%', icon: '⚠️', color: 'text-yellow-400' },
        ],
        recommendations: [
            { text: 'Continue current irrigation schedule. Soil moisture is optimal.', priority: 'info' },
            { text: 'Apply routine nitrogen top-dressing in 7–10 days per forecast model.', priority: 'info' },
            { text: 'Schedule next satellite scan in 48 hours for pattern tracking.', priority: 'info' },
        ],
        yieldDelta: '+22',
    },
    bacterial: {
        label: 'Bacterial Blight — Moderate Risk',
        color: '#f59e0b',
        healthScore: 58,
        bacterialRiskPct: 34.7,
        bacterialRiskLevel: 'Moderate',
        riskColor: 'text-yellow-400',
        barColor: 'from-yellow-700 to-yellow-400',
        healthBarColor: 'from-yellow-600 to-yellow-400',
        signals: [
            { name: 'Xanthomonas oryzae', value: 'Detected — 34.7%', icon: '⚠️', color: 'text-yellow-400' },
            { name: 'Chlorophyll Drop', value: '-22% vs baseline', icon: '⚠️', color: 'text-yellow-400' },
            { name: 'Moisture Stress', value: 'Above threshold', icon: '⚠️', color: 'text-yellow-400' },
            { name: 'Leaf Necrosis Markers', value: '12.3% area affected', icon: '🔴', color: 'text-red-400' },
        ],
        recommendations: [
            { text: 'URGENT: Apply copper-based bactericide within 24–48 hours to limit spread.', priority: 'urgent' },
            { text: 'Isolate affected zones — do not cross-contaminate with healthy fields.', priority: 'urgent' },
            { text: 'Reduce overhead irrigation to lower leaf wetness duration.', priority: 'warning' },
            { text: 'Re-scan in 72 hours to monitor treatment response.', priority: 'info' },
        ],
        yieldDelta: '-14',
    },
    critical: {
        label: 'Fire Blight — Critical Infection',
        color: '#ef4444',
        healthScore: 21,
        bacterialRiskPct: 78.3,
        bacterialRiskLevel: 'Critical',
        riskColor: 'text-red-400',
        barColor: 'from-red-700 to-red-400',
        healthBarColor: 'from-red-700 to-red-400',
        signals: [
            { name: 'Erwinia amylovora', value: 'Critical — 78.3%', icon: '🔴', color: 'text-red-400' },
            { name: 'Shoot Blight Pattern', value: 'Shepherd\'s crook detected', icon: '🔴', color: 'text-red-400' },
            { name: 'Canker Formation', value: '34% stem coverage', icon: '🔴', color: 'text-red-400' },
            { name: 'Systemic Spread', value: 'Vascular colonization detected', icon: '🔴', color: 'text-red-400' },
        ],
        recommendations: [
            { text: 'CRITICAL: Contain immediately. Remove and destroy all infected plant material.', priority: 'urgent' },
            { text: 'Do NOT compost infected tissue — incinerate or dispose off-site.', priority: 'urgent' },
            { text: 'Apply streptomycin-based spray (if legally permitted in your region).', priority: 'urgent' },
            { text: 'Notify regional agricultural extension office for quarantine assessment.', priority: 'warning' },
            { text: 'Disinfect all tools with 10% bleach solution between cuts.', priority: 'warning' },
        ],
        yieldDelta: '-67',
    },
};

/* ===================================================
   LOADING STEPS
   =================================================== */
const LOADING_STEPS = [
    { label: 'Preprocessing image…', pct: 10 },
    { label: 'Running spectral analysis…', pct: 25 },
    { label: 'Identifying pathogen signatures…', pct: 45 },
    { label: 'Computing health index…', pct: 65 },
    { label: 'Generating recommendations…', pct: 85 },
    { label: 'Finalizing AI report…', pct: 98 },
];

/* ===================================================
   DOM REFERENCES
   =================================================== */
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const analyzeBtnText = document.getElementById('analyze-btn-text');
const resetBtn = document.getElementById('reset-btn');
const uploadPrompt = document.getElementById('upload-prompt');
const previewContainer = document.getElementById('image-preview-container');
const previewImg = document.getElementById('preview-img');
const previewFilename = document.getElementById('preview-filename');
const scanLine = document.getElementById('scan-line');
const resultsPanel = document.getElementById('results-panel');
const scanLoading = document.getElementById('scan-loading');
const scanResults = document.getElementById('scan-results');
const loadingStep = document.getElementById('loading-step');
const loadingBar = document.getElementById('loading-bar');

let currentSample = null;

/* ===================================================
   DROP ZONE EVENTS
   =================================================== */
browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadFile(file);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
});

function loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewFilename.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        showPreview();
        currentSample = null;
    };
    reader.readAsDataURL(file);
}

function showPreview() {
    uploadPrompt.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    dropZone.classList.add('has-image');
    analyzeBtn.disabled = false;
    resetBtn.classList.remove('hidden');
    // Hide previous results
    resultsPanel.className = 'results-panel-hidden';
    scanLoading.classList.add('hidden');
    scanResults.classList.add('hidden');
}

/* ===================================================
   SAMPLE BUTTONS
   =================================================== */
function loadSample(type) {
    currentSample = type;
    const data = SAMPLES[type];
    // Generate a placeholder colored SVG as "image"
    const svgColors = { healthy: '#1B4332', bacterial: '#78350f', critical: '#7f1d1d' };
    const svgEmojis = { healthy: '🌿', bacterial: '🍂', critical: '🔴' };
    const svg = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280">
    <rect width="400" height="280" fill="${svgColors[type]}"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="72">${svgEmojis[type]}</text>
    <text x="50%" y="72%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="white" font-family="sans-serif">${data.label}</text>
  </svg>`)}`;
    previewImg.src = svg;
    previewFilename.textContent = `🔬 Sample: ${data.label}`;
    showPreview();
}

/* ===================================================
   RESET SCAN
   =================================================== */
function resetScan() {
    uploadPrompt.classList.remove('hidden');
    previewContainer.classList.add('hidden');
    dropZone.classList.remove('has-image', 'drag-over');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
    <span>Run AI Diagnosis</span>`;
    resetBtn.classList.add('hidden');
    scanLine.classList.add('hidden');
    resultsPanel.className = 'results-panel-hidden';
    scanLoading.classList.add('hidden');
    scanResults.classList.add('hidden');
    fileInput.value = '';
    previewImg.src = '';
    currentSample = null;
}

/* ===================================================
   AI ANALYSIS ENGINE (mock with staged progress)
   =================================================== */
analyzeBtn.addEventListener('click', runAnalysis);

async function runAnalysis() {
    analyzeBtn.disabled = true;
    scanLine.classList.remove('hidden');

    // Show results panel in loading state
    resultsPanel.className = 'results-panel-visible';
    scanLoading.classList.remove('hidden');
    scanResults.classList.add('hidden');

    // Scroll results panel into view
    setTimeout(() => {
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);

    // Fake staged loading
    await runLoadingSteps();

    // Pick result data
    const data = currentSample ? SAMPLES[currentSample] : getRandomResult();

    // Reveal results
    scanLoading.classList.add('hidden');
    scanResults.classList.remove('hidden');
    scanLine.classList.add('hidden');

    renderResults(data);
    updateDashboardFromScan(data);
    logActivity(`Scan completed — ${data.label}`);
}

function runLoadingSteps() {
    return new Promise((resolve) => {
        let i = 0;
        function nextStep() {
            if (i >= LOADING_STEPS.length) { resolve(); return; }
            const s = LOADING_STEPS[i];
            loadingStep.textContent = s.label;
            loadingBar.style.width = s.pct + '%';
            i++;
            setTimeout(nextStep, 480 + Math.random() * 240);
        }
        nextStep();
    });
}

function getRandomResult() {
    const keys = Object.keys(SAMPLES);
    return SAMPLES[keys[Math.floor(Math.random() * keys.length)]];
}

/* ===================================================
   RENDER RESULTS
   =================================================== */
function renderResults(data) {
    state.lastResult = data;

    // Timestamp
    document.getElementById('report-timestamp').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Title / subtitle
    document.getElementById('report-title').textContent = data.label;
    document.getElementById('report-subtitle').textContent =
        `Analysis complete · Confidence 97.3% · ${data.signals.length} signals detected`;

    // Health score
    const healthEl = document.getElementById('health-score-display');
    healthEl.className = 'text-4xl font-black ' + (data.healthScore >= 70 ? 'text-forest-400' : data.healthScore >= 40 ? 'text-yellow-400' : 'text-red-400');
    healthEl.innerHTML = `${data.healthScore}<span class="text-lg font-normal text-gray-500">/100</span>`;
    setTimeout(() => {
        document.getElementById('health-bar').style.width = data.healthScore + '%';
        document.getElementById('health-bar').className = `h-full rounded-full bg-gradient-to-r ${data.healthBarColor} transition-all duration-1000`;
    }, 100);
    document.getElementById('health-label').className = 'text-xs mt-2 font-semibold ' + (data.healthScore >= 70 ? 'text-forest-400' : data.healthScore >= 40 ? 'text-yellow-400' : 'text-red-400');
    document.getElementById('health-label').textContent = data.healthScore >= 70 ? '● Good Condition' : data.healthScore >= 40 ? '⚠ Moderate Stress' : '🔴 Critical Condition';

    // Bacterial risk
    const bacterialEl = document.getElementById('bacterial-risk-display');
    bacterialEl.className = 'text-4xl font-black ' + data.riskColor;
    bacterialEl.innerHTML = `${data.bacterialRiskLevel}<span class="text-xl font-normal text-gray-500 ml-2">${data.bacterialRiskPct}%</span>`;
    setTimeout(() => {
        document.getElementById('bacterial-bar').style.width = data.bacterialRiskPct + '%';
        document.getElementById('bacterial-bar').className = `h-full rounded-full bg-gradient-to-r ${data.barColor} transition-all duration-1000`;
    }, 100);
    document.getElementById('bacterial-label').className = 'text-xs mt-2 font-semibold ' + data.riskColor;
    document.getElementById('bacterial-label').textContent = `● ${data.bacterialRiskPct}% pathogen load detected`;

    // Signals
    const pathogenList = document.getElementById('pathogen-list');
    pathogenList.innerHTML = data.signals.map(s => `
    <li class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span>${s.icon}</span>
        <span class="text-sm text-gray-300 font-medium">${s.name}</span>
      </div>
      <span class="text-xs font-semibold ${s.color}">${s.value}</span>
    </li>
  `).join('');

    // Recommendations
    const recList = document.getElementById('recommendation-list');
    const priorityColors = { urgent: 'text-red-400', warning: 'text-yellow-400', info: 'text-gray-400' };
    const priorityIcons = { urgent: '🔴', warning: '⚠️', info: '💡' };
    recList.innerHTML = data.recommendations.map(r => `
    <li class="flex items-start gap-2 text-sm">
      <span class="flex-shrink-0 mt-0.5">${priorityIcons[r.priority]}</span>
      <span class="${priorityColors[r.priority]}">${r.text}</span>
    </li>
  `).join('');
}

/* ===================================================
   UPDATE LIVE DASHBOARD FROM SCAN
   =================================================== */
function updateDashboardFromScan(data) {
    state.scanCount++;

    // Update KPI cards
    const hi = data.healthScore;
    document.getElementById('dash-health-index').innerHTML =
        `${hi}<span class="text-lg font-normal text-gray-500">/100</span>`;
    document.getElementById('dash-health-label').textContent =
        hi >= 70 ? '● Excellent' : hi >= 40 ? '⚠ Moderate' : '🔴 Critical';
    document.getElementById('dash-health-label').className =
        'text-xs mt-2 font-semibold ' + (hi >= 70 ? 'text-forest-400' : hi >= 40 ? 'text-yellow-400' : 'text-red-400');

    document.getElementById('dash-bacterial-risk').innerHTML =
        `${data.bacterialRiskLevel}<span class="text-xl font-normal text-gray-500 ml-2" id="dash-bacterial-pct">${data.bacterialRiskPct}%</span>`;
    document.getElementById('dash-bacterial-label').textContent =
        data.bacterialRiskLevel === 'Low' ? '● No active threat' : data.bacterialRiskLevel === 'Moderate' ? '⚠ Monitor closely' : '🔴 Immediate action required';
    document.getElementById('dash-bacterial-label').className =
        'text-xs mt-2 font-semibold ' + (data.bacterialRiskLevel === 'Low' ? 'text-green-400' : data.bacterialRiskLevel === 'Moderate' ? 'text-yellow-400' : 'text-red-400');

    document.getElementById('dash-yield').innerHTML =
        `${data.yieldDelta}<span class="text-lg font-normal text-gray-500">%</span>`;
    document.getElementById('dash-yield').className =
        'text-4xl font-black ' + (data.yieldDelta.startsWith('+') ? 'text-forest-400' : 'text-red-400');

    document.getElementById('dash-scans').textContent = state.scanCount;

    // Update history chart with new data point
    state.history.push(hi);
    if (state.history.length > 7) state.history.shift();
    renderChart();

    // Add to field table
    addScanToFieldTable(data);
}

/* ===================================================
   RENDER CHART
   =================================================== */
function renderChart() {
    const container = document.querySelector('.chart-container');
    const maxVal = Math.max(...state.history, 100);

    container.innerHTML = state.history.map((val, i) => {
        const heightPct = (val / maxVal) * 100;
        const isAtRisk = val < 60;
        const isLatest = i === state.history.length - 1;
        const barColor = isAtRisk
            ? 'linear-gradient(to top, #92400e, #f59e0b)'
            : 'linear-gradient(to top, #1B4332, #52b788)';
        const border = isLatest ? '2px solid #FF8C00' : '2px solid transparent';
        return `
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="height:${heightPct}%; background:${barColor}; border:${border}; min-height:8px;">
          <div class="chart-tooltip">${val}/100</div>
        </div>
      </div>`;
    }).join('');
}

/* ===================================================
   FIELD STATUS TABLE
   =================================================== */
function renderFieldTable() {
    const tbody = document.getElementById('field-table-body');
    tbody.innerHTML = state.fields.map(f => {
        const statusClass = { nominal: 'status-nominal', warning: 'status-warning', critical: 'status-critical' }[f.status];
        const statusLabel = { nominal: '● Nominal', warning: '⚠ Warning', critical: '🔴 Critical' }[f.status];
        const healthColor = f.health >= 70 ? 'text-forest-400' : f.health >= 40 ? 'text-yellow-400' : 'text-red-400';
        return `
      <tr>
        <td class="pr-6 font-medium text-white">${f.name} <span class="text-xs text-gray-600 font-mono">${f.id}</span></td>
        <td class="pr-6">${f.crop}</td>
        <td class="pr-6 font-bold ${healthColor}">${f.health}/100</td>
        <td class="pr-6 ${f.bacterial >= 40 ? 'text-red-400' : f.bacterial >= 20 ? 'text-yellow-400' : 'text-green-400'} font-semibold">${f.bacterial}%</td>
        <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
      </tr>`;
    }).join('');
}

function addScanToFieldTable(data) {
    // Update or add "Scanned Field" row
    const existing = state.fields.findIndex(f => f.id === 'SCAN');
    const status = data.healthScore >= 70 ? 'nominal' : data.healthScore >= 40 ? 'warning' : 'critical';
    const entry = { id: 'SCAN', name: 'Scanned Field', crop: data.label.split(' ')[0], health: data.healthScore, bacterial: data.bacterialRiskPct, status };
    if (existing >= 0) state.fields[existing] = entry;
    else state.fields.unshift(entry);
    renderFieldTable();
}

/* ===================================================
   ACTIVITY LOG
   =================================================== */
function logActivity(message) {
    const log = document.getElementById('activity-log');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const li = document.createElement('li');
    li.className = 'flex items-start gap-3 log-entry';
    li.innerHTML = `
    <div class="w-1.5 h-1.5 rounded-full bg-orange-action mt-1.5 flex-shrink-0"></div>
    <div>
      <p class="text-sm text-gray-300 font-medium">${message}</p>
      <p class="text-xs text-gray-600 mt-0.5">${time}</p>
    </div>`;
    log.prepend(li);
    // Keep max 6 entries
    while (log.children.length > 6) log.removeChild(log.lastChild);
}

/* ===================================================
   STICKY HEADER GLASS
   =================================================== */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        header.style.background = 'rgba(7,26,17,0.9)';
        header.style.backdropFilter = 'blur(16px)';
        header.style.webkitBackdropFilter = 'blur(16px)';
        header.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        header.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
    } else {
        header.style.background = '';
        header.style.backdropFilter = '';
        header.style.webkitBackdropFilter = '';
        header.style.borderBottom = '';
        header.style.boxShadow = '';
    }
});

/* ===================================================
   MOBILE MENU TOGGLE
   =================================================== */
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
menuToggle.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
mobileMenu.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => mobileMenu.classList.add('hidden'))
);

/* ===================================================
   CONTACT FORM
   =================================================== */
function handleSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const emailInput = document.getElementById('email-input');
    const email = emailInput.value;
    btn.textContent = 'Sending…';
    btn.disabled = true;
    setTimeout(() => {
        const form = document.getElementById('contact-form');
        form.parentNode.innerHTML = `
      <div class="form-success text-center py-6">
        <div class="w-16 h-16 rounded-full bg-forest-700 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-forest-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-white mb-2">You're on the list!</h3>
        <p class="text-gray-400 text-sm">We'll send your demo access to <strong class="text-white">${email}</strong> within 24 hours.</p>
      </div>`;
        logActivity(`Demo requested: ${email}`);
    }, 1500);
}

/* ===================================================
   NAVIGATE TO DASHBOARD (from scan results CTA)
   =================================================== */
function viewInDashboard() {
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
}

/* ===================================================
   INIT
   =================================================== */
function init() {
    renderChart();
    renderFieldTable();
    logActivity('AgriGuard AI initialized · Satellite sync active');
}

document.addEventListener('DOMContentLoaded', init);
