/**
 * Desenho Colaborativo - Script Principal
 * Versão: 20250130004 - Fix funcionalidades quebradas (cor, tamanho, ferramentas)
 * Cache-Control: no-cache, no-store, must-revalidate
 */

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
        this.hasJoinedRoom = false;
        
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
        
        // Color picker click to show/hide preset colors
        document.getElementById('colorPicker').addEventListener('click', (e) => {
            e.stopPropagation();
            const presetColors = document.querySelector('.preset-colors');
            presetColors.classList.toggle('hidden');
        });
        
        // Hide preset colors when clicking outside
        document.addEventListener('click', (e) => {
            const colorGroup = document.querySelector('.color-group');
            const presetColors = document.querySelector('.preset-colors');
            if (!colorGroup.contains(e.target)) {
                presetColors.classList.add('hidden');
            }
        });
        
        // Preset colors
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentColor = btn.dataset.color;
                document.getElementById('colorPicker').value = this.currentColor;
                document.querySelector('.preset-colors').classList.add('hidden');
            });
        });
        
        // Chrome mobile specific: Handle page visibility changes
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        
        if (isChromeOnMobile) {
            console.log('🔥 Chrome mobile: Setting up page visibility handler');
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.currentRoom && !this.hasJoinedRoom) {
                    console.log('🔥 Chrome mobile: Page became visible, checking connection...');
                    setTimeout(() => {
                        if (!this.hasJoinedRoom && this.isConnected) {
                            console.log('🔥 Chrome mobile: Retrying JOIN_ROOM after visibility change');
                            this.sendJoinRoomMessage();
                        }
                    }, 200);
                }
            });
        }
    }

    connectWebSocket() {
        console.log('connectWebSocket called - protocol:', window.location.protocol, 'host:', window.location.host);
        console.log('User agent:', navigator.userAgent);
        
        // Enhanced Chrome mobile detection
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        console.log('Browser detection:', {
            isAndroid: isAndroid,
            isChrome: isChrome,
            isChromeOnMobile: isChromeOnMobile,
            userAgent: navigator.userAgent
        });
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/drawing`;
        console.log('WebSocket URL:', wsUrl);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected successfully');
            console.log('Chrome mobile detection in onopen:', isChromeOnMobile);
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            
            // Process queued messages
            if (this.messageQueue && this.messageQueue.length > 0) {
                console.log('Processing', this.messageQueue.length, 'queued messages');
                this.messageQueue.forEach((message, index) => {
                    console.log('Sending queued message', index + 1, ':', message);
                    if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                        console.log('Chrome mobile: Processing queued JOIN_ROOM message');
                    }
                    try {
                        this.websocket.send(JSON.stringify(message));
                        if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                            console.log('Chrome mobile: Queued JOIN_ROOM sent successfully');
                        }
                    } catch (error) {
                        console.error('Error sending queued message:', error);
                        if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                            console.error('Chrome mobile: Failed to send queued JOIN_ROOM:', error);
                        }
                    }
                });
                this.messageQueue = [];
            }
            
            // If we have room info but haven't joined yet, send JOIN_ROOM immediately
            if (this.currentRoom && this.playerName && !this.hasJoinedRoom) {
                console.log('Auto-joining room on WebSocket connect');
                if (isChromeOnMobile) {
                    console.log('Chrome mobile: Applying special AUTO-JOIN strategy');
                    // For Chrome mobile, try multiple times with different delays
                    setTimeout(() => this.sendJoinRoomMessage(), 100);
                    setTimeout(() => {
                        if (!this.hasJoinedRoom) {
                            console.log('Chrome mobile: AUTO-JOIN retry 1');
                            this.sendJoinRoomMessage();
                        }
                    }, 500);
                    setTimeout(() => {
                        if (!this.hasJoinedRoom) {
                            console.log('Chrome mobile: AUTO-JOIN retry 2');
                            this.sendJoinRoomMessage();
                        }
                    }, 1000);
                } else {
                    const delay = 100;
                    setTimeout(() => {
                        this.sendJoinRoomMessage();
                    }, delay);
                }
            }
        };
        
        this.websocket.onmessage = (event) => {
            console.log('WebSocket message received:', event.data);
            try {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        };
        
        this.websocket.onclose = (event) => {
            console.log('WebSocket disconnected - code:', event.code, 'reason:', event.reason);
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
        console.log('sendWebSocketMessage called with:', message);
        
        // Enhanced Chrome mobile detection
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        
        if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
            console.log('🔥 Chrome mobile: sendWebSocketMessage called for JOIN_ROOM');
            console.log('🔥 Chrome mobile: Message details:', JSON.stringify(message));
            console.log('🔥 Chrome mobile: WebSocket state:', this.websocket ? this.websocket.readyState : 'null');
        }
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.log('WebSocket is open, sending message:', JSON.stringify(message));
            try {
                this.websocket.send(JSON.stringify(message));
                if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                    console.log('🔥 Chrome mobile: JOIN_ROOM successfully sent via sendWebSocketMessage');
                }
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
                if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                    console.error('🔥 Chrome mobile: Failed to send JOIN_ROOM via sendWebSocketMessage:', error);
                }
            }
        } else {
            console.warn('WebSocket not ready, queueing message. State:', 
                this.websocket ? this.websocket.readyState : 'null');
            // Queue message to send when connection is ready
            if (!this.messageQueue) {
                this.messageQueue = [];
            }
            this.messageQueue.push(message);
            
            if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                console.log('🔥 Chrome mobile: JOIN_ROOM queued for later sending');
            }
            
            // If not connecting, try to connect
            if (!this.websocket || this.websocket.readyState === WebSocket.CLOSED) {
                console.log('WebSocket closed, attempting to reconnect...');
                this.connectWebSocket();
            }
        }
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'CANVAS_UPDATE':
                if (message.canvasData) {
                    // Only load canvas data if current canvas is mostly empty
                    if (this.isCanvasEmpty()) {
                        this.loadCanvasFromData(message.canvasData);
                    }
                }
                break;
            case 'DRAWING_ACTION':
                this.renderDrawingAction(message.drawingAction);
                break;
            case 'CLEAR_CANVAS':
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                break;
            case 'PLAYER_LIST_UPDATE':
                console.log('Received player list update:', message.playerName);
                this.updatePlayersList(message.playerName);
                // Mark as successfully joined when we receive player list
                this.hasJoinedRoom = true;
                // Clear retry timeout since we successfully joined
                if (this.joinRetryTimeout) {
                    clearTimeout(this.joinRetryTimeout);
                    this.joinRetryTimeout = null;
                }
                break;
            default:
                if (message.error) {
                    console.error('WebSocket error:', message.error);
                    alert(message.error);
                }
        }
    }

    sendJoinRoomMessage() {
        console.log('sendJoinRoomMessage called - currentRoom:', this.currentRoom, 'playerName:', this.playerName);
        console.log('WebSocket state:', this.websocket ? this.websocket.readyState : 'null');
        console.log('isConnected:', this.isConnected);
        
        // Enhanced Chrome mobile detection
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        
        console.log('Enhanced Chrome mobile detection:', {
            isAndroid: isAndroid,
            isChrome: isChrome,
            isChromeOnMobile: isChromeOnMobile,
            userAgent: navigator.userAgent.substring(0, 100) + '...'
        });
        
        if (this.currentRoom && this.playerName) {
            console.log('Sending JOIN_ROOM message for:', this.currentRoom, this.playerName);
            const joinMessage = {
                type: 'JOIN_ROOM',
                roomId: this.currentRoom,
                playerName: this.playerName
            };
            console.log('JOIN_ROOM message object:', JSON.stringify(joinMessage));
            
            // Chrome mobile specific: Multiple aggressive attempts with forced sends
            if (isChromeOnMobile) {
                console.log('🔥 Chrome mobile: Using SUPER AGGRESSIVE JOIN_ROOM strategy');
                
                // Force immediate multiple sends
                for (let i = 0; i < 3; i++) {
                    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                        console.log(`🔥 Chrome mobile: FORCE send attempt ${i + 1}`);
                        try {
                            this.websocket.send(JSON.stringify(joinMessage));
                            console.log(`🔥 Chrome mobile: FORCE attempt ${i + 1} sent`);
                        } catch (error) {
                            console.error(`🔥 Chrome mobile: FORCE attempt ${i + 1} failed:`, error);
                        }
                    }
                }
                
                // Delayed attempts
                const delays = [50, 100, 200, 500, 800, 1200];
                delays.forEach((delay, index) => {
                    setTimeout(() => {
                        if (!this.hasJoinedRoom && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                            console.log(`🔥 Chrome mobile: Delayed attempt ${index + 1} - After ${delay}ms`);
                            try {
                                this.websocket.send(JSON.stringify(joinMessage));
                                console.log(`🔥 Chrome mobile: Delayed attempt ${index + 1} sent`);
                            } catch (error) {
                                console.error(`🔥 Chrome mobile: Delayed attempt ${index + 1} failed:`, error);
                            }
                        }
                    }, delay);
                });
                
                // Also use the standard method as backup
                setTimeout(() => {
                    if (!this.hasJoinedRoom) {
                        console.log('🔥 Chrome mobile: Using standard method as backup');
                        this.sendWebSocketMessage(joinMessage);
                    }
                }, 1500);
                
            } else {
                // Standard behavior for non-Chrome mobile
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    console.log('Standard: Sending JOIN_ROOM directly via WebSocket');
                    try {
                        this.websocket.send(JSON.stringify(joinMessage));
                        console.log('Standard: JOIN_ROOM sent successfully');
                    } catch (error) {
                        console.error('Standard: Error sending JOIN_ROOM:', error);
                        this.sendWebSocketMessage(joinMessage);
                    }
                } else {
                    console.log('Standard: WebSocket not ready, using sendWebSocketMessage method');
                    this.sendWebSocketMessage(joinMessage);
                }
            }
            
            // Set a timeout to retry if we haven't joined successfully
            if (!this.joinRetryTimeout) {
                const retryDelay = isChromeOnMobile ? 2000 : 3000;
                this.joinRetryTimeout = setTimeout(() => {
                    if (!this.hasJoinedRoom && this.currentRoom) {
                        console.log('🔄 JOIN_ROOM failed, retrying... hasJoinedRoom:', this.hasJoinedRoom);
                        this.sendJoinRoomMessage();
                    }
                    this.joinRetryTimeout = null;
                }, retryDelay);
            }
        } else {
            console.warn('Cannot send JOIN_ROOM - missing room or player name');
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
                // Use longer delay for mobile devices, especially Chrome mobile
                const isAndroid = /Android/i.test(navigator.userAgent);
                const isChrome = /Chrome/i.test(navigator.userAgent);
                const isChromeOnMobile = isChrome && isAndroid;
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                let delay = 500; // Default
                if (isChromeOnMobile) {
                    delay = 3000; // Chrome mobile needs MUCH more time
                } else if (isMobile) {
                    delay = 1500; // Other mobile browsers
                }
                console.log('🔍 Room creation detection:', {
                    isAndroid: isAndroid,
                    isChrome: isChrome,
                    isChromeOnMobile: isChromeOnMobile,
                    isMobile: isMobile,
                    delay: delay
                });
                setTimeout(() => {
                    this.sendJoinRoomMessage();
                }, delay);
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
        // Use longer delay for mobile devices, especially Chrome mobile
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        let delay = 500; // Default
        if (isChromeOnMobile) {
            delay = 3000; // Chrome mobile needs MUCH more time
        } else if (isMobile) {
            delay = 1500; // Other mobile browsers
        }
        console.log('🔍 Join room detection:', {
            isAndroid: isAndroid,
            isChrome: isChrome,
            isChromeOnMobile: isChromeOnMobile,
            isMobile: isMobile,
            delay: delay
        });
        setTimeout(() => {
            this.sendJoinRoomMessage();
        }, delay);
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
        
        if (this.joinRetryTimeout) {
            clearTimeout(this.joinRetryTimeout);
            this.joinRetryTimeout = null;
        }
        
        this.currentRoom = null;
        this.playerName = null;
        this.isConnected = false;
        this.hasJoinedRoom = false;
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

    isCanvasEmpty() {
        // Get image data and check if it's mostly empty
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        // Count non-transparent pixels
        let nonTransparentPixels = 0;
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 0) { // Alpha channel
                nonTransparentPixels++;
            }
        }
        
        // Consider canvas empty if less than 1% of pixels are drawn
        const totalPixels = this.canvas.width * this.canvas.height;
        const threshold = totalPixels * 0.01;
        
        return nonTransparentPixels < threshold;
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
            
            // Send drawing end action
            this.sendDrawingAction(this.lastX, this.lastY, this.lastX, this.lastY, false, true);
            
            // Send canvas update to save the current state after a small delay
            // This ensures the server has the latest canvas state for new players
            setTimeout(() => {
                this.sendCanvasUpdate();
            }, 200);
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
