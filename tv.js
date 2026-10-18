// ============================================================
// ENDORPHIN | ТВ ЭКРАН | ЛОГИКА (ПОЛНАЯ ВЕРСИЯ)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================================
// КОНФИГУРАЦИЯ
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const gameId = 'battle_1';
const gameRef = ref(db, `games/${gameId}`);

// ============================================================
// КЛАСС: ИГРОК
// ============================================================
class Player {
    constructor(id, data, team, index) {
        this.id = id;
        this.name = data.name || 'Игрок';
        this.lives = data.lives !== undefined ? data.lives : 3;
        this.alive = data.alive !== undefined ? data.alive : true;
        this.team = team;
        this.index = index;
        this.element = null;
    }

    createDOM() {
        const slot = document.createElement('div');
        slot.className = 'player-slot';
        slot.style.left = this.team === 'red' ? '15%' : '85%';
        
        // Позиция по Y в зависимости от индекса
        const yPos = 20 + (this.index * 60 / Math.max(1, 4)) + 10;
        slot.style.top = `${yPos}%`;

        if (this.alive) {
            slot.innerHTML = `
                <div class="player-hitbox player-${this.team}" id="player-${this.team}-${this.index}">
                    <div class="text-4xl">🧍‍♂️</div>
                    <div class="player-name">${this.name}</div>
                    <div class="player-lives">${'❤️'.repeat(this.lives)}</div>
                </div>
            `;
        } else {
            slot.innerHTML = `<div class="text-6xl opacity-30 text-gray-500">💀</div>`;
        }

        this.element = slot;
        return slot;
    }

    updateDOM() {
        if (!this.element) return;
        if (this.alive) {
            const nameEl = this.element.querySelector('.player-name');
            const livesEl = this.element.querySelector('.player-lives');
            if (nameEl) nameEl.innerText = this.name;
            if (livesEl) livesEl.innerText = '❤️'.repeat(this.lives);
        }
    }
}

// ============================================================
// КЛАСС: СИСТЕМА ЧАСТИЦ (ВЗРЫВЫ)
// ============================================================
class ParticleSystem {
    constructor(container) {
        this.container = container;
        this.particles = [];
    }

    explode(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            
            const size = Math.random() * 12 + 4;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = `${x}px`;
            p.style.top = `${y}px`;
            p.style.background = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`;
            
            this.container.appendChild(p);
            this.particles.push(p);

            // Случайная траектория
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150 + 50;
            const destX = x + Math.cos(angle) * distance;
            const destY = y + Math.sin(angle) * distance;

            p.animate([
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(${destX - x}px, ${destY - y}px) scale(0)`, opacity: 0 }
            ], { 
                duration: 600 + Math.random() * 400, 
                easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', 
                fill: 'forwards' 
            }).onfinish = () => {
                p.remove();
                this.particles = this.particles.filter(item => item !== p);
            };
        }
    }
}

// ============================================================
// КЛАСС: СНЕЖОК (ФИЗИКА ПОЛЕТА)
// ============================================================
class Snowball {
    constructor(container, startX, startY, endX, endY, onHit) {
        this.container = container;
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.onHit = onHit;
        this.element = null;
        this.progress = 0;
        this.speed = 0.02; // Скорость анимации
        this.animationId = null;
    }

    createElement() {
        const ball = document.createElement('div');
        ball.className = 'snowball';
        ball.style.left = `${this.x}px`;
        ball.style.top = `${this.y}px`;
        this.container.appendChild(ball);
        this.element = ball;
    }

    animate() {
        this.progress += this.speed;
        
        if (this.progress >= 1) {
            this.progress = 1;
            this.element.style.left = `${this.endX}px`;
            this.element.style.top = `${this.endY}px`;
            
            setTimeout(() => {
                if (this.onHit) this.onHit();
                this.element.remove();
            }, 100);
            
            return;
        }

        // Параболическая траектория (дуга)
        const currentX = this.startX + (this.endX - this.startX) * this.progress;
        // Высота дуги (синусоида для плавности)
        const arcHeight = -150 * Math.sin(this.progress * Math.PI);
        const currentY = this.startY + (this.endY - this.startY) * this.progress + arcHeight;

        this.element.style.left = `${currentX}px`;
        this.element.style.top = `${currentY}px`;

        // Шлейф (маленькие снежинки)
        if (Math.random() > 0.5) {
            const trail = document.createElement('div');
            trail.className = 'particle';
            trail.style.width = '8px';
            trail.style.height = '8px';
            trail.style.left = `${currentX}px`;
            trail.style.top = `${currentY}px`;
            trail.style.background = 'rgba(255, 255, 255, 0.5)';
            this.container.appendChild(trail);
            setTimeout(() => trail.remove(), 300);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    start() {
        this.createElement();
        this.animate();
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.element) this.element.remove();
    }
}

// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ИНИЦИАЛИЗАЦИЯ
// ============================================================
let currentData = null;
let playersData = { red: [], blue: [] };
let currentMode = null;
let currentBaseUrl = '';
let particleSystem = null;
let activeSnowball = null;

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
// ОТРИСОВКА ПОЛЯ
// ============================================================
function renderBattlefield(data) {
    const field = document.getElementById('battlefield');
    if (!particleSystem) {
        particleSystem = new ParticleSystem(field);
    }
    
    // Проверка на изменение состава
    if (field.children.length !== data.mode.charAt(0) * 2) {
        field.innerHTML = '';
        
        // Отрисовка красных
        for (let i = 0; i < playersData.red.length; i++) {
            const p = new Player(playersData.red[i].id, playersData.red[i], 'red', i);
            field.appendChild(p.createDOM());
            playersData.red[i] = p; // Сохраняем экземпляр
        }

        // Отрисовка синих
        for (let i = 0; i < playersData.blue.length; i++) {
            const p = new Player(playersData.blue[i].id, playersData.blue[i], 'blue', i);
            field.appendChild(p.createDOM());
            playersData.blue[i] = p;
        }
    } else {
        // Обновление существующих
        playersData.red.forEach(p => p.updateDOM && p.updateDOM());
        playersData.blue.forEach(p => p.updateDOM && p.updateDOM());
    }

    // Обновление глобальных сердечек
    const totalRedLives = playersData.red.reduce((sum, p) => sum + (p.lives || 0), 0);
    const totalBlueLives = playersData.blue.reduce((sum, p) => sum + (p.lives || 0), 0);
    
    document.getElementById('heart-red').innerText = '❤️'.repeat(totalRedLives) || '💀';
    document.getElementById('heart-blue').innerText = '❤️'.repeat(totalBlueLives) || '💀';
}

// ============================================================
// АНИМАЦИЯ ВЫСТРЕЛА
// ============================================================
function handleShot(shot) {
    const field = document.getElementById('battlefield');
    if (!field) return;

    // Получаем координаты стрелка
    const shooterEl = document.getElementById(`player-${shot.team}-${shot.shooterIndex}`);
    const targetEl = document.getElementById(`player-${shot.targetTeam}-${shot.targetIndex}`);
    
    if (!shooterEl || !targetEl) {
        console.warn('Не найдены элементы для выстрела');
        return;
    }

    const fieldRect = field.getBoundingClientRect();
    const sRect = shooterEl.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();

    // Стартовые и конечные координаты
    const startX = sRect.left - fieldRect.left + sRect.width / 2;
    const startY = sRect.top - fieldRect.top + sRect.height / 2;
    
    let endX = tRect.left - fieldRect.left + tRect.width / 2;
    let endY = tRect.top - fieldRect.top + tRect.height / 2;

    // Если промах, уводим цель в сторону
    if (!shot.isHit) {
        endX += (Math.random() > 0.5 ? 300 : -300);
        endY += (Math.random() > 0.5 ? 200 : -200);
    }

    // Создаем снежок и запускаем
    const ball = new Snowball(field, startX, startY, endX, endY, () => {
        if (shot.isHit) {
            // Взрыв частиц
            if (particleSystem) particleSystem.explode(endX, endY, 20);
            
            // Тряска экрана
            document.getElementById('main-body').classList.add('screen-shake');
            setTimeout(() => document.getElementById('main-body').classList.remove('screen-shake'), 500);

            // Вспышка
            const flash = document.createElement('div');
            flash.className = 'flash-effect';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 300);

            // Мегабросок
            if (shot.isMega) {
                const megaDiv = document.createElement('div');
                megaDiv.className = 'mega-text';
                megaDiv.innerText = 'МЕГАБРОСОК!';
                document.body.appendChild(megaDiv);
                setTimeout(() => megaDiv.remove(), 2500);
            }
        }
    });
    
    ball.start();
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
// СЛУШАТЕЛЬ СОСТОЯНИЯ ИГРЫ
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
    
    // Подготовка данных для классов
    const redPlayers = Object.entries(data.players?.red || {}).map(([id, p], idx) => ({ ...p, id, index: idx }));
    const bluePlayers = Object.entries(data.players?.blue || {}).map(([id, p], idx) => ({ ...p, id, index: idx }));

    // Преобразуем в экземпляры классов (только при изменении списка)
    if (redPlayers.length !== playersData.red.length || bluePlayers.length !== playersData.blue.length) {
        playersData.red = redPlayers.map(p => new Player(p.id, p, 'red', p.index));
        playersData.blue = bluePlayers.map(p => new Player(p.id, p, 'blue', p.index));
    } else {
        // Обновляем жизни
        playersData.red.forEach((p, i) => {
            if (redPlayers[i]) {
                p.lives = redPlayers[i].lives;
                p.alive = redPlayers[i].alive;
            }
        });
        playersData.blue.forEach((p, i) => {
            if (bluePlayers[i]) {
                p.lives = bluePlayers[i].lives;
                p.alive = bluePlayers[i].alive;
            }
        });
    }

    // Обновление лобби
    document.getElementById('tv-players-red').innerHTML = playersData.red.map(p => 
        `<div class="text-red-300 font-bold bg-red-900/40 py-1 rounded border border-red-500/50">👤 ${p.name}</div>`
    ).join('');
    
    document.getElementById('tv-players-blue').innerHTML = playersData.blue.map(p => 
        `<div class="text-blue-300 font-bold bg-blue-900/40 py-1 rounded border border-blue-500/50">👤 ${p.name}</div>`
    ).join('');

    // Переключение экранов
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
            winText.className = 'text-9xl font-black text-red-500 mb-12'; 
        } else if (data.winner === 'blue') { 
            winText.innerText = 'СИНИЕ ПОБЕДИЛИ!'; 
            winText.className = 'text-9xl font-black text-blue-500 mb-12'; 
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
// СЛУШАТЕЛЬ ВЫСТРЕЛОВ
// ============================================================
onValue(ref(db, `games/${gameId}/last_shot`), (snap) => {
    const shot = snap.val();
    if (!shot) return;
    
    // Защита от дублей
    if (shot.animated) return;
    shot.animated = true;

    handleShot(shot);
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
