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
        this.websocket = null;
        this.reconnectInterval = null;
        this.isConnected = false;
        
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

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/drawing`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
        };
        
        this.websocket.onmessage = (event) => {
            this.handleWebSocketMessage(JSON.parse(event.data));
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.scheduleReconnect();
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
            this.updateConnectionStatus(false);
        };
    }

    scheduleReconnect() {
        if (!this.reconnectInterval && this.currentRoom) {
            this.reconnectInterval = setInterval(() => {
                if (!this.isConnected) {
                    console.log('Attempting to reconnect...');
                    this.connectWebSocket();
                }
            }, 5000);
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const body = document.body;
        
        if (connected) {
            statusElement.textContent = 'Conectado';
            body.classList.remove('disconnected');
            body.classList.add('connected');
            this.enableGameControls(true);
        } else {
            statusElement.textContent = 'Desconectado';
            body.classList.remove('connected');
            body.classList.add('disconnected');
            this.enableGameControls(false);
        }
    }

    enableGameControls(enabled) {
        const tools = document.querySelectorAll('.tool');
        const brushSize = document.getElementById('brushSize');
        const colorPicker = document.getElementById('colorPicker');
        
        tools.forEach(tool => tool.disabled = !enabled);
        brushSize.disabled = !enabled;
        colorPicker.disabled = !enabled;
        
        if (this.canvas) {
            this.canvas.style.pointerEvents = enabled ? 'auto' : 'none';
        }
    }

    sendWebSocketMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        }
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'CANVAS_UPDATE':
                if (message.canvasData) {
                    this.loadCanvasFromData(message.canvasData);
                }
                break;
            case 'DRAWING_ACTION':
                this.renderDrawingAction(message.drawingAction);
                break;
            case 'CLEAR_CANVAS':
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                break;
            case 'PLAYER_LIST_UPDATE':
                this.updatePlayersList(message.playerName);
                break;
            default:
                if (message.error) {
                    alert(message.error);
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
        this.connectWebSocket();
    }

    async createRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Por favor, digite seu nome!');
            return;
        }

        try {
            const response = await fetch('/api/rooms/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentRoom = data.roomId;
                this.playerName = playerName;
                this.updateGameInfo();
                this.showGameScreen();
                
                // Join the room via WebSocket
                setTimeout(() => {
                    this.sendWebSocketMessage({
                        type: 'JOIN_ROOM',
                        roomId: this.currentRoom,
                        playerName: this.playerName
                    });
                }, 500);
            } else {
                alert('Erro ao criar sala. Tente novamente.');
            }
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Erro ao criar sala. Verifique sua conexão.');
        }
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

        this.currentRoom = roomCode;
        this.playerName = playerName;
        this.updateGameInfo();
        this.showGameScreen();
        
        // Join the room via WebSocket
        setTimeout(() => {
            this.sendWebSocketMessage({
                type: 'JOIN_ROOM',
                roomId: this.currentRoom,
                playerName: this.playerName
            });
        }, 500);
    }

    leaveRoom() {
        if (this.currentRoom && this.playerName) {
            this.sendWebSocketMessage({
                type: 'LEAVE_ROOM',
                roomId: this.currentRoom,
                playerName: this.playerName
            });
        }
        
        if (this.websocket) {
            this.websocket.close();
        }
        
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        this.currentRoom = null;
        this.playerName = null;
        this.isConnected = false;
        this.showLoginScreen();
    }

    updateGameInfo() {
        document.getElementById('currentRoom').textContent = this.currentRoom;
        document.getElementById('currentPlayer').textContent = this.playerName;
    }

    updatePlayersList(playersString) {
        document.getElementById('playersList').textContent = playersString || '';
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

    loadCanvasFromData(canvasData) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = canvasData;
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
        if (!this.isConnected) return;
        
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        
        // Send drawing start action
        this.sendDrawingAction(pos.x, pos.y, pos.x, pos.y, true, false);
    }

    draw(e) {
        if (!this.isDrawing || !this.isConnected) return;
        
        const pos = this.getMousePos(e);
        
        // Draw locally
        this.drawLine(this.lastX, this.lastY, pos.x, pos.y);
        
        // Send drawing action to server
        this.sendDrawingAction(this.lastX, this.lastY, pos.x, pos.y, false, false);
        
        this.lastX = pos.x;
        this.lastY = pos.y;
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // Send drawing end action and canvas update
            this.sendDrawingAction(this.lastX, this.lastY, this.lastX, this.lastY, false, true);
            
            // Send full canvas update
            setTimeout(() => {
                this.sendCanvasUpdate();
            }, 100);
        }
    }

    drawLine(startX, startY, endX, endY) {
        this.ctx.globalCompositeOperation = this.currentTool === 'eraser' ? 'destination-out' : 'source-over';
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#000000' : this.currentColor;
        this.ctx.lineWidth = this.currentSize;
        
        if (this.currentTool === 'spray') {
            this.spray(endX, endY);
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
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

    renderDrawingAction(action) {
        const prevTool = this.currentTool;
        const prevColor = this.currentColor;
        const prevSize = this.currentSize;
        
        // Temporarily set the action's properties
        this.currentTool = action.tool;
        this.currentColor = action.color;
        this.currentSize = action.size;
        
        // Draw the action
        this.drawLine(action.startX, action.startY, action.endX, action.endY);
        
        // Restore previous properties
        this.currentTool = prevTool;
        this.currentColor = prevColor;
        this.currentSize = prevSize;
    }

    sendDrawingAction(startX, startY, endX, endY, isStart, isEnd) {
        this.sendWebSocketMessage({
            type: 'DRAWING_ACTION',
            roomId: this.currentRoom,
            drawingAction: {
                tool: this.currentTool,
                color: this.currentColor,
                size: this.currentSize,
                startX: startX,
                startY: startY,
                endX: endX,
                endY: endY,
                isStart: isStart,
                isEnd: isEnd
            }
        });
    }

    sendCanvasUpdate() {
        if (this.canvas) {
            this.sendWebSocketMessage({
                type: 'CANVAS_UPDATE',
                roomId: this.currentRoom,
                canvasData: this.canvas.toDataURL()
            });
        }
    }

    clearCanvas() {
        if (confirm('Tem certeza que deseja limpar todo o desenho? Esta ação não pode ser desfeita.')) {
            this.sendWebSocketMessage({
                type: 'CLEAR_CANVAS',
                roomId: this.currentRoom
            });
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new DrawingGame();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.game && window.game.websocket) {
        window.game.websocket.close();
    }
});

// Store game instance globally for debugging
window.addEventListener('DOMContentLoaded', () => {
    window.game = new DrawingGame();
});
