class DrawingGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentSize = 5;
        this.lastX = 0;
        this.lastY = 0;
        this.currentRoom = null;
        this.playerName = null;
        this.players = new Set();
        this.saveTimeout = null;
        
        // Storage key for localStorage
        this.storageKey = 'drawingGame_rooms';
        this.playersKey = 'drawingGame_players';
        
        // Initialize rooms from localStorage
        this.loadRoomsFromStorage();
        
        // Listen for storage changes from other tabs
        window.addEventListener('storage', (e) => this.handleStorageChange(e));
        
        // Update player list periodically
        this.playerUpdateInterval = setInterval(() => this.updatePlayersList(), 2000);
        
        // Check for canvas updates from other tabs
        this.canvasUpdateInterval = null;
        
        this.initializeEventListeners();
        this.showLoginScreen();
    }

    initializeEventListeners() {
        // Login screen events
        document.getElementById('joinRoom').addEventListener('click', () => this.joinRoom());
        document.getElementById('createRoom').addEventListener('click', () => this.createRoom());
        document.getElementById('roomCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Game screen events
        document.getElementById('leaveRoom').addEventListener('click', () => this.leaveRoom());
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        
        // Tool selection
        document.getElementById('brushTool').addEventListener('click', () => this.selectTool('brush'));
        document.getElementById('eraserTool').addEventListener('click', () => this.selectTool('eraser'));
        document.getElementById('sprayTool').addEventListener('click', () => this.selectTool('spray'));
        
        // Size control
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.currentSize = e.target.value;
            document.getElementById('sizeDisplay').textContent = e.target.value;
        });
        
        // Color controls
        document.getElementById('colorPicker').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });
        
        // Preset colors
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentColor = btn.dataset.color;
                document.getElementById('colorPicker').value = this.currentColor;
            });
        });
    }

    loadRoomsFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const roomsData = JSON.parse(stored);
                this.rooms = new Map();
                Object.keys(roomsData).forEach(roomCode => {
                    this.rooms.set(roomCode, {
                        players: new Set(roomsData[roomCode].players || []),
                        canvas: roomsData[roomCode].canvas || null
                    });
                });
            } else {
                this.rooms = new Map();
            }
        } catch (e) {
            console.error('Error loading rooms from storage:', e);
            this.rooms = new Map();
        }
    }

    saveRoomsToStorage() {
        try {
            const roomsData = {};
            this.rooms.forEach((value, key) => {
                roomsData[key] = {
                    players: Array.from(value.players),
                    canvas: value.canvas
                };
            });
            localStorage.setItem(this.storageKey, JSON.stringify(roomsData));
        } catch (e) {
            console.error('Error saving rooms to storage:', e);
        }
    }

    handleStorageChange(e) {
        if (e.key === this.storageKey) {
            // Reload rooms when another tab updates them
            this.loadRoomsFromStorage();
            
            // Update canvas if we're in a room
            if (this.currentRoom && this.canvas) {
                this.loadRoomCanvas();
            }
            
            // Update player list
            this.updateGameInfo();
        }
    }

    updatePlayersList() {
        if (this.currentRoom) {
            // Mark this player as active
            const playersData = JSON.parse(localStorage.getItem(this.playersKey) || '{}');
            if (!playersData[this.currentRoom]) {
                playersData[this.currentRoom] = {};
            }
            playersData[this.currentRoom][this.playerName] = Date.now();
            
            // Clean up inactive players (older than 5 seconds)
            const now = Date.now();
            Object.keys(playersData[this.currentRoom]).forEach(player => {
                if (now - playersData[this.currentRoom][player] > 5000) {
                    delete playersData[this.currentRoom][player];
                }
            });
            
            localStorage.setItem(this.playersKey, JSON.stringify(playersData));
            
            // Update the room data
            if (this.rooms.has(this.currentRoom)) {
                const room = this.rooms.get(this.currentRoom);
                room.players = new Set(Object.keys(playersData[this.currentRoom]));
                this.saveRoomsToStorage();
                this.updateGameInfo();
            }
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
    }

    showGameScreen() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        this.initializeCanvas();
        
        // Start checking for canvas updates from other tabs
        this.canvasUpdateInterval = setInterval(() => {
            if (this.currentRoom && this.canvas) {
                this.checkForCanvasUpdates();
            }
        }, 500);
    }

    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    createRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Por favor, digite seu nome!');
            return;
        }

        const roomCode = this.generateRoomCode();
        this.currentRoom = roomCode;
        this.playerName = playerName;
        
        // Create new room
        this.rooms.set(roomCode, {
            players: new Set([playerName]),
            canvas: null
        });
        
        this.saveRoomsToStorage();
        this.updateGameInfo();
        this.showGameScreen();
    }

    joinRoom() {
        const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
        const playerName = document.getElementById('playerName').value.trim();
        
        if (!roomCode) {
            alert('Por favor, digite o código da sala!');
            return;
        }
        
        if (!playerName) {
            alert('Por favor, digite seu nome!');
            return;
        }

        // Check if room exists, if not create it
        if (!this.rooms.has(roomCode)) {
            this.rooms.set(roomCode, {
                players: new Set(),
                canvas: null
            });
        }

        const room = this.rooms.get(roomCode);
        
        // Check if name is already taken in this room
        if (room.players.has(playerName)) {
            alert('Este nome já está sendo usado nesta sala. Escolha outro nome.');
            return;
        }

        room.players.add(playerName);
        this.currentRoom = roomCode;
        this.playerName = playerName;
        
        this.saveRoomsToStorage();
        this.updateGameInfo();
        this.showGameScreen();
    }

    leaveRoom() {
        if (this.currentRoom && this.rooms.has(this.currentRoom)) {
            const room = this.rooms.get(this.currentRoom);
            room.players.delete(this.playerName);
            
            // Remove room if empty
            if (room.players.size === 0) {
                this.rooms.delete(this.currentRoom);
            }
            
            this.saveRoomsToStorage();
            
            // Clean up player data
            const playersData = JSON.parse(localStorage.getItem(this.playersKey) || '{}');
            if (playersData[this.currentRoom] && playersData[this.currentRoom][this.playerName]) {
                delete playersData[this.currentRoom][this.playerName];
                localStorage.setItem(this.playersKey, JSON.stringify(playersData));
            }
        }
        
        this.currentRoom = null;
        this.playerName = null;
        
        // Clear the update interval
        if (this.playerUpdateInterval) {
            clearInterval(this.playerUpdateInterval);
            this.playerUpdateInterval = setInterval(() => this.updatePlayersList(), 2000);
        }
        
        // Clear canvas update interval
        if (this.canvasUpdateInterval) {
            clearInterval(this.canvasUpdateInterval);
            this.canvasUpdateInterval = null;
        }
        
        this.showLoginScreen();
    }

    updateGameInfo() {
        document.getElementById('currentRoom').textContent = this.currentRoom;
        document.getElementById('currentPlayer').textContent = this.playerName;
        
        if (this.rooms.has(this.currentRoom)) {
            const room = this.rooms.get(this.currentRoom);
            document.getElementById('playersList').textContent = Array.from(room.players).join(', ');
        }
    }

    initializeCanvas() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth - 40;
        const maxHeight = container.clientHeight - 40;
        
        this.canvas.width = Math.min(800, maxWidth);
        this.canvas.height = Math.min(600, maxHeight);
        
        // Set up canvas
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Load existing canvas data for this room
        this.loadRoomCanvas();
        
        // Add event listeners
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }

    loadRoomCanvas() {
        if (this.rooms.has(this.currentRoom)) {
            const room = this.rooms.get(this.currentRoom);
            if (room.canvas) {
                const img = new Image();
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0);
                };
                img.src = room.canvas;
            }
        }
    }

    saveRoomCanvas() {
        if (this.rooms.has(this.currentRoom)) {
            const room = this.rooms.get(this.currentRoom);
            const newCanvasData = this.canvas.toDataURL();
            if (room.canvas !== newCanvasData) {
                room.canvas = newCanvasData;
                this.saveRoomsToStorage();
            }
        }
    }

    checkForCanvasUpdates() {
        if (!this.rooms.has(this.currentRoom)) return;
        
        const room = this.rooms.get(this.currentRoom);
        const currentCanvasData = this.canvas.toDataURL();
        
        // Reload rooms data to get latest from localStorage
        this.loadRoomsFromStorage();
        
        if (this.rooms.has(this.currentRoom)) {
            const updatedRoom = this.rooms.get(this.currentRoom);
            if (updatedRoom.canvas && updatedRoom.canvas !== currentCanvasData) {
                // Canvas was updated by another tab, reload it
                this.loadRoomCanvas();
            }
        }
    }

    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tool + 'Tool').classList.add('active');
        
        // Update cursor
        if (tool === 'eraser') {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        
        this.ctx.globalCompositeOperation = this.currentTool === 'eraser' ? 'destination-out' : 'source-over';
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#000000' : this.currentColor;
        this.ctx.lineWidth = this.currentSize;
        
        if (this.currentTool === 'spray') {
            this.spray(pos.x, pos.y);
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        }
        
        this.lastX = pos.x;
        this.lastY = pos.y;
        
        // Save canvas state with debouncing
        this.debouncedSave();
    }

    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.saveRoomCanvas();
        }, 100);
    }

    spray(x, y) {
        const density = 20;
        const radius = this.currentSize;
        
        for (let i = 0; i < density; i++) {
            const offsetX = (Math.random() - 0.5) * radius * 2;
            const offsetY = (Math.random() - 0.5) * radius * 2;
            
            this.ctx.fillStyle = this.currentColor;
            this.ctx.beginPath();
            this.ctx.arc(x + offsetX, y + offsetY, 1, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            // Force save when stopping drawing
            this.saveRoomCanvas();
        }
    }

    clearCanvas() {
        if (confirm('Tem certeza que deseja limpar todo o desenho? Esta ação não pode ser desfeita.')) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.saveRoomCanvas();
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new DrawingGame();
});

// Handle window resize
window.addEventListener('resize', () => {
    // You might want to handle canvas resize here
});
