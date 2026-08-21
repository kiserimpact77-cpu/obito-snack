/**
 * SNAKE MULTIVERSE
 * Core Game Engine
 */

class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.screens = {
            menu: document.getElementById('menu-screen'),
            howTo: document.getElementById('how-to-screen'),
            game: document.getElementById('game-screen'),
            results: document.getElementById('results-screen')
        };
        this.overlays = {
            countdown: document.getElementById('countdown-overlay'),
            pause: document.getElementById('pause-overlay')
        };
        
        // Game State
        this.playerCount = 3;
        this.players = [];
        this.food = [];
        this.particles = [];
        this.gameState = 'MENU'; // MENU, COUNTDOWN, PLAYING, PAUSED, GAMEOVER
        this.lastTime = 0;
        this.gameTime = 0;
        this.gridSize = 20;
        this.worldSize = { width: 0, height: 0 };
        
        // Settings
        this.colors = [
            '#ef4444', // Red
            '#3b82f6', // Blue
            '#10b981', // Green
            '#f59e0b'  // Orange
        ];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Start Loop
        requestAnimationFrame((t) => this.loop(t));
        
        lucide.createIcons();
    }

    setupEventListeners() {
        // Player selection
        document.querySelectorAll('.player-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.player-opt').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.playerCount = parseInt(opt.dataset.players);
            });
        });

        // Main Menu buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startCountdown());
        document.getElementById('how-to-btn').addEventListener('click', () => this.showScreen('howTo'));
        
        // Navigation
        document.querySelectorAll('.back-to-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                this.gameState = 'MENU';
                this.showScreen('menu');
                this.overlays.pause.classList.remove('active');
            });
        });

        // Game Actions
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
        document.querySelectorAll('.restart-btn').forEach(btn => {
            btn.addEventListener('click', () => this.startCountdown());
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.worldSize.width = this.canvas.width;
        this.worldSize.height = this.canvas.height;
    }

    showScreen(screenKey) {
        Object.values(this.screens).forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        this.screens[screenKey].classList.remove('hidden');
        setTimeout(() => this.screens[screenKey].classList.add('active'), 10);
    }

    startCountdown() {
        this.resetGame();
        this.showScreen('game');
        this.gameState = 'COUNTDOWN';
        this.overlays.countdown.classList.add('active');
        this.overlays.pause.classList.remove('active');
        
        let count = 3;
        const text = document.getElementById('countdown-text');
        text.innerText = count;
        
        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                text.innerText = count;
            } else if (count === 0) {
                text.innerText = "GO!";
            } else {
                clearInterval(timer);
                this.overlays.countdown.classList.remove('active');
                this.gameState = 'PLAYING';
            }
        }, 800);
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.innerText = message;
        toast.classList.remove('hidden');
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 2000);
    }

    resetGame() {
        this.players = [];
        this.food = [];
        this.particles = [];
        this.gameTime = 0;
        
        const margin = 100;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Create Players
        for (let i = 0; i < this.playerCount; i++) {
            let startPos, startDir;
            
            if (this.playerCount === 2) {
                if (i === 0) {
                    startPos = { x: width/2, y: margin };
                    startDir = { x: 0, y: 1 };
                } else {
                    startPos = { x: width/2, y: height - margin };
                    startDir = { x: 0, y: -1 };
                }
            } else {
                // Corners for 3 or 4 players
                const spots = [
                    { p: { x: margin, y: margin }, d: { x: 1, y: 0 } },
                    { p: { x: width - margin, y: margin }, d: { x: -1, y: 0 } },
                    { p: { x: margin, y: height - margin }, d: { x: 1, y: 0 } },
                    { p: { x: width - margin, y: height - margin }, d: { x: -1, y: 0 } }
                ];
                startPos = spots[i].p;
                startDir = spots[i].d;
            }
            
            this.players.push(new Snake(i, startPos, startDir, this.colors[i]));
        }
        
        this.setupControls();
        this.updateHUD();
        
        // Initial food
        for (let i = 0; i < 15; i++) this.spawnFood();
    }

    setupControls() {
        const container = document.getElementById('controls-container');
        container.innerHTML = '';
        
        const zones = [];
        if (this.playerCount === 2) {
            zones.push('zone-top', 'zone-bottom');
        } else if (this.playerCount === 3) {
            zones.push('zone-tl', 'zone-tr', 'zone-bottom');
        } else {
            zones.push('zone-tl', 'zone-tr', 'zone-bl', 'zone-br');
        }
        
        this.players.forEach((p, i) => {
            const zone = document.createElement('div');
            zone.className = `joystick-zone ${zones[i]} player-${i+1}-control`;
            zone.innerHTML = `
                <div class="joystick-base">
                    <div class="joystick-stick"></div>
                </div>
            `;
            
            const stick = zone.querySelector('.joystick-stick');
            let isDragging = false;
            let startX, startY;
            
            const handleStart = (e) => {
                isDragging = true;
                const touch = e.touches ? e.touches[0] : e;
                startX = touch.clientX;
                startY = touch.clientY;
                e.preventDefault();
            };
            
            const handleMove = (e) => {
                if (!isDragging) return;
                const touch = e.touches ? e.touches[0] : e;
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const maxDist = 40;
                
                const angle = Math.atan2(dy, dx);
                const moveX = Math.min(dist, maxDist) * Math.cos(angle);
                const moveY = Math.min(dist, maxDist) * Math.sin(angle);
                
                stick.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
                
                // Update player direction (min deadzone)
                if (dist > 10) {
                    // Snap to grid directions for classic snake feel, or smooth? 
                    // Let's try 4 directions first for better control on shared screen
                    if (Math.abs(dx) > Math.abs(dy)) {
                        p.setNextDir({ x: dx > 0 ? 1 : -1, y: 0 });
                    } else {
                        p.setNextDir({ x: 0, y: dy > 0 ? 1 : -1 });
                    }
                }
            };
            
            const handleEnd = () => {
                isDragging = false;
                stick.style.transform = `translate(-50%, -50%)`;
            };
            
            zone.addEventListener('touchstart', handleStart);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
            
            container.appendChild(zone);
        });
    }

    togglePause() {
        if (this.gameState === 'PLAYING') {
            this.gameState = 'PAUSED';
            this.overlays.pause.classList.add('active');
        } else if (this.gameState === 'PAUSED') {
            this.gameState = 'PLAYING';
            this.overlays.pause.classList.remove('active');
        }
    }

    spawnFood() {
        this.food.push({
            x: 20 + Math.random() * (this.canvas.width - 40),
            y: 20 + Math.random() * (this.canvas.height - 40),
            size: 6 + Math.random() * 4,
            hue: Math.random() * 360,
            pulse: 0
        });
    }

    updateHUD() {
        const board = document.getElementById('score-board');
        board.innerHTML = '';
        this.players.forEach((p, i) => {
            const score = document.createElement('div');
            score.className = `mini-score`;
            score.style.borderColor = p.color;
            score.style.opacity = p.alive ? '1' : '0.3';
            score.innerHTML = `P${i+1}: ${p.score}`;
            board.appendChild(score);
        });
    }

    loop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        if (this.gameState === 'PLAYING') {
            this.gameTime += dt;
            this.update(dt);
        }
        
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Update Players
        this.players.forEach(p => {
            if (p.alive) p.update(dt, this.gridSize);
        });
        
        // Collision: Body vs Body
        this.players.forEach(p => {
            if (!p.alive) return;
            
            // Check world bounds
            const head = p.segments[0];
            if (head.x < 0 || head.x > this.canvas.width || head.y < 0 || head.y > this.canvas.height) {
                this.eliminatePlayer(p, "OUT OF BOUNDS");
            }
            
            // Check against other snakes (and self)
            this.players.forEach(other => {
                if (!other.alive && other.segments.length === 0) return;
                
                other.segments.forEach((seg, idx) => {
                    // Skip head of self
                    if (p === other && idx === 0) return;
                    
                    const dist = Math.sqrt((head.x - seg.x)**2 + (head.y - seg.y)**2);
                    if (dist < this.gridSize * 0.8) {
                        // Head to Head check
                        if (other.alive && idx === 0) {
                            // Rare double-kill or coin flip?
                            // Let's do head-on: both die if exactly front, else smaller dies
                            this.eliminatePlayer(p, "COLLISION");
                            this.eliminatePlayer(other, "COLLISION");
                        } else {
                            this.eliminatePlayer(p, "CRASHED");
                        }
                    }
                });
            });
            
            // Check food
            this.food.forEach((f, fIdx) => {
                const dist = Math.sqrt((head.x - f.x)**2 + (head.y - f.y)**2);
                if (dist < this.gridSize) {
                    p.grow();
                    this.food.splice(fIdx, 1);
                    this.spawnFood();
                    this.updateHUD();
                    this.createExplosion(f.x, f.y, f.hue, 5);
                }
            });
        });
        
        // Update Particles
        this.particles.forEach((pt, idx) => {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= dt;
            if (pt.life <= 0) this.particles.splice(idx, 1);
        });
        
        // Check Win Condition
        const alivePlayers = this.players.filter(p => p.alive);
        if (this.playerCount > 1 && alivePlayers.length <= 1) {
            if (alivePlayers.length === 1 || (alivePlayers.length === 0 && this.players.length > 0)) {
                this.endGame(alivePlayers[0]);
            }
        }
    }

    eliminatePlayer(player, reason) {
        if (!player.alive) return;
        player.alive = false;
        
        // Visual impact
        this.createExplosion(player.segments[0].x, player.segments[0].y, player.color, 20);
        
        // Turn body into food
        player.segments.forEach((seg, i) => {
            if (i % 2 === 0) { // Every 2nd segment becomes food to avoid clutter
                this.food.push({
                    x: seg.x,
                    y: seg.y,
                    size: 8,
                    hue: Math.random() * 360,
                    pulse: 0
                });
            }
        });
        
        player.segments = []; // Remove body
        this.updateHUD();
    }

    createExplosion(x, y, colorOrHue, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: typeof colorOrHue === 'number' ? `hsl(${colorOrHue}, 80%, 60%)` : colorOrHue,
                life: 0.5 + Math.random() * 0.5,
                size: 2 + Math.random() * 4
            });
        }
    }

    endGame(winner) {
        this.gameState = 'GAMEOVER';
        const winnerText = document.getElementById('winner-text');
        winnerText.innerText = winner ? `PLAYER ${winner.id + 1} WINS!` : "IT'S A DRAW!";
        winnerText.style.color = winner ? winner.color : '#fff';
        
        const list = document.getElementById('rankings-list');
        list.innerHTML = '';
        
        const ranked = [...this.players].sort((a, b) => b.score - a.score);
        ranked.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'ranking-item';
            item.innerHTML = `
                <span class="rank-num">#${i+1}</span>
                <span class="player-tag" style="background: ${p.color}22; color: ${p.color}">PLAYER ${p.id + 1}</span>
                <span class="rank-score">${p.score}</span>
            `;
            list.appendChild(item);
        });
        
        this.showScreen('results');
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Background Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
        }
        
        // Draw Food
        this.food.forEach(f => {
            f.pulse += 0.1;
            const s = f.size + Math.sin(f.pulse) * 2;
            ctx.fillStyle = `hsl(${f.hue}, 80%, 60%)`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(f.x, f.y, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // Draw Players
        this.players.forEach(p => p.draw(ctx, this.gridSize));
        
        // Draw Particles
        this.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }
}

class Snake {
    constructor(id, pos, dir, color) {
        this.id = id;
        this.color = color;
        this.segments = [];
        this.alive = true;
        this.score = 0;
        this.dir = { ...dir };
        this.nextDir = { ...dir };
        this.speed = 120; // px per second
        this.moveAccumulator = 0;
        
        // Initial segments
        for (let i = 0; i < 5; i++) {
            this.segments.push({ x: pos.x - dir.x * i * 20, y: pos.y - dir.y * i * 20 });
        }
    }

    setNextDir(newDir) {
        // Prevent 180 turns
        if (newDir.x !== -this.dir.x || newDir.y !== -this.dir.y) {
            this.nextDir = newDir;
        }
    }

    update(dt, gridSize) {
        this.moveAccumulator += dt * this.speed;
        
        if (this.moveAccumulator >= gridSize) {
            this.moveAccumulator -= gridSize;
            this.dir = { ...this.nextDir };
            
            // Move body
            for (let i = this.segments.length - 1; i > 0; i--) {
                this.segments[i] = { ...this.segments[i - 1] };
            }
            
            // Move head
            this.segments[0].x += this.dir.x * gridSize;
            this.segments[0].y += this.dir.y * gridSize;
        }
    }

    grow() {
        this.score += 10;
        const last = this.segments[this.segments.length - 1];
        this.segments.push({ ...last });
        this.speed += 2; // Slightly faster
    }

    draw(ctx, gridSize) {
        if (!this.alive && this.segments.length === 0) return;
        
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Draw Body Path
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = gridSize * 0.8;
        this.segments.forEach((seg, i) => {
            if (i === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
        });
        ctx.stroke();
        
        // Draw Head Detail
        const head = this.segments[0];
        if (head) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(head.x, head.y, gridSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#000';
            const eyeOffset = gridSize * 0.2;
            // Simplified eye placement based on direction
            const ex1 = head.x + (this.dir.x * eyeOffset) + (this.dir.y * eyeOffset);
            const ey1 = head.y + (this.dir.y * eyeOffset) - (this.dir.x * eyeOffset);
            const ex2 = head.x + (this.dir.x * eyeOffset) - (this.dir.y * eyeOffset);
            const ey2 = head.y + (this.dir.y * eyeOffset) + (this.dir.x * eyeOffset);
            
            ctx.beginPath(); ctx.arc(ex1, ey1, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex2, ey2, 2, 0, Math.PI * 2); ctx.fill();
        }
    }
}

// Start
window.addEventListener('load', () => new SnakeGame());
