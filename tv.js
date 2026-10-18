// ============================================================
// ENDORPHIN | ТВ ЭКРАН | ЛОГИКА
// ============================================================

// ============================================================
// ИМПОРТЫ FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================================
// КОНФИГУРАЦИЯ FIREBASE
// ============================================================
const firebaseConfig = { 
    apiKey: "AIzaSyCXIR5Tv8lB6ivcGRC3yt1SC66MM6T5b_M", 
    authDomain: "endorphin-battle.firebaseapp.com", 
    databaseURL: "https://endorphin-battle-default-rtdb.europe-west1.firebasedatabase.app", 
    projectId: "endorphin-battle", 
    storageBucket: "endorphin-battle.firebasestorage.app", 
    messagingSenderId: "185259733030", 
    appId: "1:185259733030:web:d72a89a436880973e636e7" 
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const gameId = 'battle_1';
const gameRef = ref(db, `games/${gameId}`);

// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
let currentData = null;
let playersData = { red: [], blue: [] };
let currentMode = null;
let currentBaseUrl = '';

// ============================================================
// УТИЛИТЫ
// ============================================================
function getBaseUrl() {
    const url = new URL(window.location.href);
    return url.origin + url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);
}
currentBaseUrl = getBaseUrl();

// ============================================================
// ГЕНЕРАЦИЯ QR-КОДОВ
// ============================================================
function generateQRs() {
    document.getElementById('qr-container').classList.remove('hidden');
    document.getElementById('tv-status').classList.remove('hidden');
    
    const redUrl = `${currentBaseUrl}play.html?game=${gameId}&team=red`;
    const blueUrl = `${currentBaseUrl}play.html?game=${gameId}&team=blue`;
    
    document.getElementById('qr-red').innerHTML = '';
    document.getElementById('qr-blue').innerHTML = '';
    
    const qrRed = qrcode(0, 'M'); 
    qrRed.addData(redUrl); 
    qrRed.make();
    document.getElementById('qr-red').innerHTML = qrRed.createImgTag(4, 8);
    
    const qrBlue = qrcode(0, 'M'); 
    qrBlue.addData(blueUrl); 
    qrBlue.make();
    document.getElementById('qr-blue').innerHTML = qrBlue.createImgTag(4, 8);
}

// ============================================================
// ОБНОВЛЕНИЕ БЕГУЩЕЙ СТРОКИ
// ============================================================
onValue(ref(db, `games/${gameId}/ticker`), (snap) => {
    if (snap.val()) {
        document.getElementById('ticker-text').innerText = snap.val();
    }
});

// ============================================================
// СЛУШАТЕЛЬ ОСНОВНОГО СОСТОЯНИЯ ИГРЫ
// ============================================================
onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    currentData = data;

    if (data.mode !== currentMode) {
        currentMode = data.mode;
        document.getElementById('tv-mode').innerText = `РЕЖИМ: ${data.mode?.toUpperCase() || 'ОЖИДАНИЕ'}`;
        if (data.status === 'lobby') generateQRs();
    }
    
    playersData.red = Object.entries(data.players?.red || {}).map(([id, p]) => ({ id, ...p }));
    playersData.blue = Object.entries(data.players?.blue || {}).map(([id, p]) => ({ id, ...p }));
    
    document.getElementById('tv-players-red').innerHTML = playersData.red.map(p => 
        `<div class="text-red-300 font-bold bg-red-900/40 py-1 rounded border border-red-500/50">👤 ${p.name}</div>`
    ).join('');
    
    document.getElementById('tv-players-blue').innerHTML = playersData.blue.map(p => 
        `<div class="text-blue-300 font-bold bg-blue-900/40 py-1 rounded border border-blue-500/50">👤 ${p.name}</div>`
    ).join('');

    if (data.status === 'lobby') {
        document.getElementById('lobby-view').classList.remove('hidden');
        document.getElementById('battle-view').classList.add('hidden');
        document.getElementById('win-view').classList.add('hidden');
        document.getElementById('win-view').classList.remove('flex');
        
        if (data.mode) {
            document.getElementById('qr-container').classList.remove('hidden');
            const maxP = parseInt(data.mode.charAt(0));
            if (playersData.red.length >= maxP && playersData.blue.length >= maxP) {
                document.getElementById('tv-status').innerText = "ВСЕ ГОТОВЫ! ЖДЕМ СТАРТА...";
                document.getElementById('tv-status').classList.add('text-green-400');
            } else {
                document.getElementById('tv-status').innerText = "ОЖИДАНИЕ ИГРОКОВ...";
                document.getElementById('tv-status').classList.remove('text-green-400');
            }
        }
    }

    if (data.status === 'playing') {
        document.getElementById('lobby-view').classList.add('hidden');
        document.getElementById('battle-view').classList.remove('hidden');
        
        renderBattlefield(data);
        
        if (data.turn && data.turn.name) {
            document.getElementById('turn-indicator').innerText = `ХОД: ${data.turn.name.toUpperCase()}`;
            document.getElementById('turn-indicator').style.color = data.turn.team === 'red' ? '#ef4444' : '#3b82f6';
        }
    }

    if (data.status === 'finished') {
        const winView = document.getElementById('win-view');
        winView.classList.remove('hidden');
        winView.classList.add('flex');
        const winText = document.getElementById('win-text');
        if (data.winner === 'red') { 
            winText.innerText = 'КРАСНЫЕ ПОБЕДИЛИ!'; 
            winText.className = 'text-9xl font-black text-red-500 mb-12 drop-shadow-[0_0_60px_#ef4444]'; 
        } else if (data.winner === 'blue') { 
            winText.innerText = 'СИНИЕ ПОБЕДИЛИ!'; 
            winText.className = 'text-9xl font-black text-blue-500 mb-12 drop-shadow-[0_0_60px_#3b82f6]'; 
        }
    }
});

// ============================================================
// СЛУШАТЕЛЬ ТАЙМЕРА
// ============================================================
onValue(ref(db, `games/${gameId}/timer`), (snap) => {
    const val = snap.val();
    if (val !== null && val !== undefined) {
        document.getElementById('tv-timer').innerText = val;
    } else {
        document.getElementById('tv-timer').innerText = '';
    }
});

// ============================================================
// ФУНКЦИЯ ОТРИСОВКИ ПОЛЯ
// ============================================================
function renderBattlefield(data) {
    const field = document.getElementById('battlefield');
    const maxP = parseInt(data.mode.charAt(0));
    
    if (field.children.length !== maxP * 2) {
        field.innerHTML = '';
        
        const renderTeam = (players, team) => {
            for (let i = 0; i < maxP; i++) {
                const p = players[i];
                const slot = document.createElement('div');
                slot.className = 'player-slot';
                
                const yPos = 20 + (i * 60 / Math.max(1, maxP)) + 10;
                slot.style.left = team === 'red' ? '15%' : '85%';
                slot.style.top = `${yPos}%`;
                
                if (p && p.alive) {
                    slot.innerHTML = `
                        <div class="player-hitbox player-${team}" id="player-${team}-${i}">
                            <div class="text-4xl">🧍‍♂️</div>
                            <div class="player-name">${p.name}</div>
                            <div class="player-lives">${'❤️'.repeat(p.lives)}</div>
                        </div>
                    `;
                } else if (p && !p.alive) {
                    slot.innerHTML = `<div class="text-6xl opacity-30 text-gray-500">💀</div>`;
                } else {
                    const teamUrl = `${currentBaseUrl}play.html?game=${gameId}&team=${team}`;
                    const qrDiv = document.createElement('div');
                    qrDiv.className = 'qr-slot';
                    const qr = qrcode(0, 'M'); 
                    qr.addData(teamUrl); 
                    qr.make();
                    qrDiv.innerHTML = qr.createImgTag(3, 5);
                    slot.appendChild(qrDiv);
                }
                field.appendChild(slot);
            }
        };
        renderTeam(playersData.red, 'red');
        renderTeam(playersData.blue, 'blue');
    } else {
        const updateTeam = (players, team) => {
            for (let i = 0; i < maxP; i++) {
                const p = players[i];
                const el = document.getElementById(`player-${team}-${i}`);
                if (el && p && p.alive) {
                    el.querySelector('.player-name').innerText = p.name;
                    el.querySelector('.player-lives').innerText = '❤️'.repeat(p.lives);
                }
            }
        };
        updateTeam(playersData.red, 'red');
        updateTeam(playersData.blue, 'blue');
    }

    document.getElementById('heart-red').innerText = '❤️'.repeat(playersData.red.reduce((a, b) => a + (b.lives || 0), 0)) || '💀';
    document.getElementById('heart-blue').innerText = '❤️'.repeat(playersData.blue.reduce((a, b) => a + (b.lives || 0), 0)) || '💀';
}

// ============================================================
// АНИМАЦИЯ ВЫСТРЕЛА
// ============================================================
onValue(ref(db, `games/${gameId}/last_shot`), (snap) => {
    const shot = snap.val();
    if (!shot) return;
    
    const field = document.getElementById('battlefield');
    const ball = document.createElement('div'); 
    ball.className = 'snowball'; 
    field.appendChild(ball);

    const shooterEl = document.getElementById(`player-${shot.team}-${shot.shooterIndex}`);
    const targetEl = document.getElementById(`player-${shot.targetTeam}-${shot.targetIndex}`);
    
    if (!shooterEl || !targetEl) return;

    const fieldRect = field.getBoundingClientRect();
    const sRect = shooterEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();

    const startX = sRect.left - fieldRect.left + sRect.width/2;
    const startY = sRect.top - fieldRect.top + sRect.height/2;
    let endX = tRect.left - fieldRect.left + tRect.width/2;
    let endY = tRect.top - fieldRect.top + tRect.height/2;

    if (!shot.isHit) { 
        endX += (Math.random() > 0.5 ? 200 : -200); 
        endY += (Math.random() > 0.5 ? 150 : -150); 
    }

    ball.style.left = startX + 'px'; 
    ball.style.top = startY + 'px';

    ball.animate([
        { left: startX + 'px', top: startY + 'px', transform: 'translate(-50%, -50%) scale(1)' },
        { left: (startX + endX) / 2 + 'px', top: startY - 100 + 'px', transform: 'translate(-50%, -50%) scale(1.5)' },
        { left: endX + 'px', top: endY + 'px', transform: 'translate(-50%, -50%) scale(1)' }
    ], { duration: 800, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'forwards' }).onfinish = () => {
        if (shot.isHit) {
            const burst = document.createElement('div'); 
            burst.className = 'snow-burst'; 
            burst.style.left = endX + 'px'; 
            burst.style.top = endY + 'px';
            field.appendChild(burst); 
            burst.animate([
                { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 }, 
                { transform: 'translate(-50%, -50%) scale(3)', opacity: 0 }
            ], { duration: 400, fill: 'forwards' });
            setTimeout(() => burst.remove(), 400);
            
            document.getElementById('main-body').classList.add('screen-shake'); 
            setTimeout(() => document.getElementById('main-body').classList.remove('screen-shake'), 500);
            
            if (shot.isMega) { 
                const megaDiv = document.createElement('div'); 
                megaDiv.className = 'mega-text'; 
                megaDiv.innerText = 'МЕГАБРОСОК!'; 
                document.body.appendChild(megaDiv); 
                setTimeout(() => megaDiv.remove(), 2500); 
            }
        }
        ball.remove();
    };
});

// ============================================================
// ГЕНЕРАЦИЯ СНЕЖИНОК
// ============================================================
const snowContainer = document.getElementById('snow-container');
for (let i = 0; i < 60; i++) {
    const s = document.createElement('div'); 
    s.className = 'snowflake'; 
    s.innerText = '❄';
    s.style.left = Math.random() * 100 + '%'; 
    s.style.fontSize = (10 + Math.random() * 20) + 'px'; 
    s.style.animationDuration = (4 + Math.random() * 8) + 's'; 
    s.style.animationDelay = (-Math.random() * 10) + 's'; 
    s.style.opacity = Math.random() * 0.7 + 0.3;
    snowContainer.appendChild(s);
}
