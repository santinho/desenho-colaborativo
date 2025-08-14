/**
 * Desenho Colaborativo - Script Principal
 * Versão: 20250130019 - Filtro de transparência estendido para cinzas mais escuros (161+)
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
        
        // Image upload properties
        this.isImageMode = false;
        this.currentImage = null;
        this.imagePosition = { x: 0, y: 0 };
        this.imageSize = { width: 0, height: 0 };
        this.isDraggingImage = false;
        this.isResizingImage = false;
        this.resizeHandle = null;
        this.dragOffset = { x: 0, y: 0 };
        this.canvasScale = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.zoom = 1;
        
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
        
        // Image selection
        document.getElementById('uploadImageBtn').addEventListener('click', () => {
            this.showImageSelectionModal();
        });
        document.getElementById('imageUpload').addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('confirmImage').addEventListener('click', () => this.confirmImage());
        document.getElementById('cancelImage').addEventListener('click', () => this.cancelImage());
        
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
        
        // Image selection modal events
        document.getElementById('closeImageModal').addEventListener('click', () => {
            this.hideImageSelectionModal();
        });
        
        document.getElementById('uploadOption').addEventListener('click', () => {
            document.getElementById('imageUpload').click();
        });
        
        // Close modal when clicking outside
        document.getElementById('imageSelectionModal').addEventListener('click', (e) => {
            if (e.target.id === 'imageSelectionModal') {
                this.hideImageSelectionModal();
            }
        });
        
        // Chrome mobile specific: Handle page visibility changes
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        
        if (isChromeOnMobile) {
            // console.log('🔥 Chrome mobile: Setting up page visibility handler');
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.currentRoom && !this.hasJoinedRoom) {
                    // console.log('🔥 Chrome mobile: Page became visible, checking connection...');
                    setTimeout(() => {
                        if (!this.hasJoinedRoom && this.isConnected) {
                            // console.log('🔥 Chrome mobile: Retrying JOIN_ROOM after visibility change');
                            this.sendJoinRoomMessage();
                        }
                    }, 200);
                }
            });
        }
    }

    connectWebSocket() {
        // console.log('connectWebSocket called - protocol:', window.location.protocol, 'host:', window.location.host);
        // console.log('User agent:', navigator.userAgent);
        
        // Enhanced Chrome mobile detection
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        // console.log('Browser detection:', {
        //     isAndroid: isAndroid,
        //     isChrome: isChrome,
        //     isChromeOnMobile: isChromeOnMobile,
        //     userAgent: navigator.userAgent
        // });
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/drawing`;
        // console.log('WebSocket URL:', wsUrl);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            // console.log('WebSocket connected successfully');
            // console.log('Chrome mobile detection in onopen:', isChromeOnMobile);
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            
            // Process queued messages
            if (this.messageQueue && this.messageQueue.length > 0) {
                // console.log('Processing', this.messageQueue.length, 'queued messages');
                this.messageQueue.forEach((message, index) => {
                    // console.log('Sending queued message', index + 1, ':', message);
                    if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                        // console.log('Chrome mobile: Processing queued JOIN_ROOM message');
                    }
                    try {
                        this.websocket.send(JSON.stringify(message));
                        if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                            // console.log('Chrome mobile: Queued JOIN_ROOM sent successfully');
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
                // console.log('Auto-joining room on WebSocket connect');
                if (isChromeOnMobile) {
                    // console.log('Chrome mobile: Applying special AUTO-JOIN strategy');
                    // For Chrome mobile, try multiple times with different delays
                    setTimeout(() => this.sendJoinRoomMessage(), 100);
                    setTimeout(() => {
                        if (!this.hasJoinedRoom) {
                            // console.log('Chrome mobile: AUTO-JOIN retry 1');
                            this.sendJoinRoomMessage();
                        }
                    }, 500);
                    setTimeout(() => {
                        if (!this.hasJoinedRoom) {
                            // console.log('Chrome mobile: AUTO-JOIN retry 2');
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
            // console.log('WebSocket message received:', event.data);
            try {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        };
        
        this.websocket.onclose = (event) => {
            // console.log('WebSocket disconnected - code:', event.code, 'reason:', event.reason);
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
                    // console.log('Attempting to reconnect...');
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
        // console.log('sendWebSocketMessage called with:', message);
        
        // Enhanced Chrome mobile detection
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        
        if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
            // console.log('🔥 Chrome mobile: sendWebSocketMessage called for JOIN_ROOM');
            // console.log('🔥 Chrome mobile: Message details:', JSON.stringify(message));
            // console.log('🔥 Chrome mobile: WebSocket state:', this.websocket ? this.websocket.readyState : 'null');
        }
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // console.log('WebSocket is open, sending message:', JSON.stringify(message));
            try {
                this.websocket.send(JSON.stringify(message));
                if (isChromeOnMobile && message.type === 'JOIN_ROOM') {
                    // console.log('🔥 Chrome mobile: JOIN_ROOM successfully sent via sendWebSocketMessage');
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
                // console.log('🔥 Chrome mobile: JOIN_ROOM queued for later sending');
            }
            
            // If not connecting, try to connect
            if (!this.websocket || this.websocket.readyState === WebSocket.CLOSED) {
                // console.log('WebSocket closed, attempting to reconnect...');
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
            case 'FORCE_CANVAS_UPDATE':
                if (message.canvasData) {
                    // Always load canvas data (used for image uploads)
                    this.loadCanvasFromData(message.canvasData);
                }
                break;
            case 'DRAWING_ACTION':
                this.renderDrawingAction(message.drawingAction);
                break;
            case 'CLEAR_CANVAS':
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.clearFloatingImages();
                break;
            case 'FLOATING_IMAGE_ADD':
                this.addFloatingImageLocal(message);
                break;
            case 'FLOATING_IMAGE_REMOVE':
                this.removeFloatingImageLocal(message.imageId);
                break;
            case 'PLAYER_LIST_UPDATE':
                // console.log('Received player list update:', message.playerName);
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
                    //alert(message.error);
                }
        }
    }

    sendJoinRoomMessage() {
        // console.log('sendJoinRoomMessage called - currentRoom:', this.currentRoom, 'playerName:', this.playerName);
        // console.log('WebSocket state:', this.websocket ? this.websocket.readyState : 'null');
        // console.log('isConnected:', this.isConnected);
        
        // Enhanced Chrome mobile detection
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isChromeOnMobile = isChrome && isAndroid;
        
        // console.log('Enhanced Chrome mobile detection:', {
        //     isAndroid: isAndroid,
        //     isChrome: isChrome,
        //     isChromeOnMobile: isChromeOnMobile,
        //     userAgent: navigator.userAgent.substring(0, 100) + '...'
        // });
        
        if (this.currentRoom && this.playerName) {
            // console.log('Sending JOIN_ROOM message for:', this.currentRoom, this.playerName);
            const joinMessage = {
                type: 'JOIN_ROOM',
                roomId: this.currentRoom,
                playerName: this.playerName
            };
            // console.log('JOIN_ROOM message object:', JSON.stringify(joinMessage));
            
            // Chrome mobile specific: Multiple aggressive attempts with forced sends
            if (isChromeOnMobile) {
                // console.log('🔥 Chrome mobile: Using SUPER AGGRESSIVE JOIN_ROOM strategy');
                
                // Force immediate multiple sends
                for (let i = 0; i < 3; i++) {
                    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                        // console.log(`🔥 Chrome mobile: FORCE send attempt ${i + 1}`);
                        try {
                            this.websocket.send(JSON.stringify(joinMessage));
                            // console.log(`🔥 Chrome mobile: FORCE attempt ${i + 1} sent`);
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
                            // console.log(`🔥 Chrome mobile: Delayed attempt ${index + 1} - After ${delay}ms`);
                            try {
                                this.websocket.send(JSON.stringify(joinMessage));
                                // console.log(`🔥 Chrome mobile: Delayed attempt ${index + 1} sent`);
                            } catch (error) {
                                console.error(`🔥 Chrome mobile: Delayed attempt ${index + 1} failed:`, error);
                            }
                        }
                    }, delay);
                });
                
                // Also use the standard method as backup
                setTimeout(() => {
                    if (!this.hasJoinedRoom) {
                        // console.log('🔥 Chrome mobile: Using standard method as backup');
                        this.sendWebSocketMessage(joinMessage);
                    }
                }, 1500);
                
            } else {
                // Standard behavior for non-Chrome mobile
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    // console.log('Standard: Sending JOIN_ROOM directly via WebSocket');
                    try {
                        this.websocket.send(JSON.stringify(joinMessage));
                        // console.log('Standard: JOIN_ROOM sent successfully');
                    } catch (error) {
                        console.error('Standard: Error sending JOIN_ROOM:', error);
                        this.sendWebSocketMessage(joinMessage);
                    }
                } else {
                    // console.log('Standard: WebSocket not ready, using sendWebSocketMessage method');
                    this.sendWebSocketMessage(joinMessage);
                }
            }
            
            // Set a timeout to retry if we haven't joined successfully
            if (!this.joinRetryTimeout) {
                const retryDelay = isChromeOnMobile ? 2000 : 3000;
                this.joinRetryTimeout = setTimeout(() => {
                    if (!this.hasJoinedRoom && this.currentRoom) {
                        // console.log('🔄 JOIN_ROOM failed, retrying... hasJoinedRoom:', this.hasJoinedRoom);
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
                // console.log('🔍 Room creation detection:', {
                //     isAndroid: isAndroid,
                //     isChrome: isChrome,
                //     isChromeOnMobile: isChromeOnMobile,
                //     isMobile: isMobile,
                //     delay: delay
                // });
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
        // console.log('🔍 Join room detection:', {
        //     isAndroid: isAndroid,
        //     isChrome: isChrome,
        //     isChromeOnMobile: isChromeOnMobile,
        //     isMobile: isMobile,
        //     delay: delay
        // });
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

        // Ensure CSS size matches canvas pixels
        this.canvas.style.width = this.canvas.width + 'px';
        this.canvas.style.height = this.canvas.height + 'px';

        // Add event listeners
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Zoom handling
        container.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
        
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
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleZoom(e) {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
        this.zoom = Math.min(Math.max(this.zoom + zoomDelta, 0.5), 3);

        this.canvas.style.width = (this.canvas.width * this.zoom) + 'px';
        this.canvas.style.height = (this.canvas.height * this.zoom) + 'px';

        if (this.isImageMode) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const canvasOffsetX = canvasRect.left;
            const canvasOffsetY = canvasRect.top;
            const imageContainer = document.querySelector('#imageOverlay .image-container');
            const overlayImage = document.getElementById('overlayImage');
            const screenX = canvasOffsetX + this.imagePosition.x * this.zoom;
            const screenY = canvasOffsetY + this.imagePosition.y * this.zoom;
            const screenWidth = this.imageSize.width * this.zoom;
            const screenHeight = this.imageSize.height * this.zoom;
            imageContainer.style.left = screenX + 'px';
            imageContainer.style.top = screenY + 'px';
            overlayImage.style.width = screenWidth + 'px';
            overlayImage.style.height = screenHeight + 'px';
            this.canvasScale = canvasRect.width / this.canvas.width;
            this.canvasOffset = { x: canvasOffsetX, y: canvasOffsetY };
        }

        this.repositionFloatingImages();
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

    // Image upload methods
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem!');
            return;
        }

        // Hide the modal
        this.hideImageSelectionModal();

        // Show loading indicator
        const uploadBtn = document.getElementById('uploadImageBtn');
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Processando...';
        uploadBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Convert white pixels to transparent
                this.convertWhiteToTransparent(img, (processedImg) => {
                    this.currentImage = processedImg;
                    this.showImageOverlay(processedImg);
                    
                    // Reset button
                    uploadBtn.textContent = originalText;
                    uploadBtn.disabled = false;
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    convertWhiteToTransparent(img, callback) {
        // Create a temporary canvas to process the image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set canvas dimensions to match image
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        
        // Draw the image onto the canvas
        tempCtx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Convert white and gray pixels to transparent
        // Extended threshold to catch darker grays including RGB(161, 161, 161)
        const grayThreshold = 120; // Lowered to catch darker grays like (161, 161, 161)
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];     // Red
            const g = data[i + 1]; // Green
            const b = data[i + 2]; // Blue
            const a = data[i + 3]; // Alpha
            
            // Check if pixel is gray/white and should be made transparent
            // Check if all RGB values are >= threshold and colors are similar (grayscale-like)
            const minVal = Math.min(r, g, b);
            const maxVal = Math.max(r, g, b);
            const isGrayish = (maxVal - minVal) <= 20; // Slightly increased tolerance for gray detection
            
            if (minVal >= grayThreshold && isGrayish) {
                // Make it transparent if it's a gray/white tone
                data[i + 3] = 0; // Set alpha to 0 (fully transparent)
            }
        }
        
        // Put the modified image data back
        tempCtx.putImageData(imageData, 0, 0);
        
        // Create a new image from the processed canvas
        const processedImg = new Image();
        processedImg.onload = () => {
            callback(processedImg);
        };
        processedImg.src = tempCanvas.toDataURL('image/png'); // Use PNG to preserve transparency
    }

    async loadAvailableImages() {
        try {
            console.log('🖼️ Loading available images...');
            
            // Gerar lista dinâmica de 001.jpg até 100.jpg
            const baseImages = [];
            for (let i = 1; i <= 100; i++) {
                const paddedNumber = i.toString().padStart(3, '0');
                baseImages.push(`${paddedNumber}.jpg`);
            }
            
            console.log(`🔍 Will check ${baseImages.length} possible images (001.jpg to 100.jpg)`);
            
            const imageOptions = document.querySelector('.image-options');
            const uploadOption = document.getElementById('uploadOption');
            
            console.log('🔍 Checking DOM elements...');
            console.log('imageOptions found:', !!imageOptions);
            console.log('uploadOption found:', !!uploadOption);
            
            if (!imageOptions) {
                console.error('❌ .image-options not found in DOM');
                return;
            }
            
            if (!uploadOption) {
                console.error('❌ #uploadOption not found in DOM');
                return;
            }
            
            // Remove todas as imagens predefinidas existentes
            const existingImages = imageOptions.querySelectorAll('.image-option[data-image]');
            existingImages.forEach(img => img.remove());
            console.log(`🗑️ Removed ${existingImages.length} existing images`);
            
            // Função para verificar se uma imagem existe
            const imageExists = (src) => {
                return new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => {
                        console.log(`✅ Image exists: ${src}`);
                        resolve(true);
                    };
                    img.onerror = () => {
                        // console.log(`❌ Image not found: ${src}`); // Remover log para não poluir
                        resolve(false);
                    };
                    
                    // Set timeout to avoid hanging
                    setTimeout(() => {
                        // console.log(`⏰ Timeout for image: ${src}`); // Remover log para não poluir
                        resolve(false);
                    }, 2000); // Reduzir timeout para ser mais rápido
                    
                    img.src = src;
                });
            };
            
            let imagesAdded = 0;
            
            // Verificar em lotes para não travar o navegador
            const batchSize = 10;
            for (let batchStart = 0; batchStart < baseImages.length; batchStart += batchSize) {
                const batch = baseImages.slice(batchStart, batchStart + batchSize);
                
                // Processar lote em paralelo
                const batchPromises = batch.map(async (imageName) => {
                    const imagePath = `images/${imageName}`;
                    
                    try {
                        const exists = await imageExists(imagePath);
                        if (exists) {
                            console.log(`📷 Adding image to modal: ${imagePath}`);
                            
                            const imageOption = document.createElement('div');
                            imageOption.className = 'image-option';
                            imageOption.dataset.image = imagePath;
                            
                            const imagePreview = document.createElement('div');
                            imagePreview.className = 'image-preview';
                            
                            const img = document.createElement('img');
                            img.src = imagePath;
                            img.alt = imageName;
                            img.loading = 'lazy';
                            
                            imagePreview.appendChild(img);
                            imageOption.appendChild(imagePreview);
                            
                            // Adicionar event listener
                            imageOption.addEventListener('click', () => {
                                console.log(`🖱️ Clicked on image: ${imagePath}`);
                                this.loadPredefinedImage(imagePath);
                            });
                            
                            // Inserir após a opção de upload
                            imageOptions.insertBefore(imageOption, uploadOption.nextSibling);
                            imagesAdded++;
                            
                            return true;
                        }
                        return false;
                    } catch (error) {
                        console.error(`❌ Error checking image ${imagePath}:`, error);
                        return false;
                    }
                });
                
                // Aguardar o lote atual terminar antes de continuar
                await Promise.all(batchPromises);
                
                // Pequena pausa entre lotes para não travar a UI
                if (batchStart + batchSize < baseImages.length) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            
            console.log(`✅ Finished loading available images. Added: ${imagesAdded} out of ${baseImages.length} checked`);
            return imagesAdded;
            
        } catch (error) {
            console.error('❌ Critical error in loadAvailableImages:', error);
            return 0;
        }
    }

    showImageSelectionModal() {
        console.log('🚀 Opening image selection modal...');
        const modal = document.getElementById('imageSelectionModal');
        
        if (!modal) {
            console.error('❌ Modal not found in DOM!');
            return;
        }
        
        console.log('✅ Modal found, removing hidden class...');
        modal.classList.remove('hidden');
        
        // Verificar se a modal está visível
        setTimeout(() => {
            const modalStyle = window.getComputedStyle(modal);
            console.log('📊 Modal display style:', modalStyle.display);
            console.log('📊 Modal visibility:', modalStyle.visibility);
        }, 100);
        
        // Carregar imagens disponíveis dinamicamente
        console.log('🔄 Starting to load available images...');
        this.loadAvailableImages().catch(error => {
            console.error('❌ Error in loadAvailableImages:', error);
        });
        
        // Fallback: forçar carregamento das imagens conhecidas após um delay
        setTimeout(() => {
            console.log('⏰ Triggering fallback after 500ms...');
            this.loadKnownImages();
        }, 500);
    }
    
    loadKnownImages() {
        console.log('🔄 Loading known images as fallback...');
        
        const imageOptions = document.querySelector('.image-options');
        const uploadOption = document.getElementById('uploadOption');
        
        console.log('🔍 Fallback - Checking DOM elements...');
        console.log('imageOptions found:', !!imageOptions);
        console.log('uploadOption found:', !!uploadOption);
        
        if (!imageOptions) {
            console.error('❌ .image-options not found in fallback');
            return;
        }
        
        if (!uploadOption) {
            console.error('❌ #uploadOption not found in fallback');
            return;
        }
        
        // Gerar lista dinâmica de 001.jpg até 020.jpg para fallback (mais rápido)
        const knownImages = [];
        for (let i = 1; i <= 20; i++) {
            const paddedNumber = i.toString().padStart(3, '0');
            knownImages.push(`${paddedNumber}.jpg`);
        }
        
        console.log(`🔄 Fallback will check ${knownImages.length} images (001.jpg to 020.jpg)`);
        
        // Verificar se as imagens já foram adicionadas
        const existingImages = imageOptions.querySelectorAll('.image-option[data-image]');
        console.log(`🔍 Found ${existingImages.length} existing images`);
        
        if (existingImages.length > 0) {
            console.log(`ℹ️ Images already loaded (${existingImages.length} found), skipping fallback`);
            return;
        }
        
        console.log('⚠️ No images found by async loader, adding known images...');
        
        let addedCount = 0;
        
        knownImages.forEach((imageName, index) => {
            const imagePath = `images/${imageName}`;
            // console.log(`📷 Force adding image ${index + 1}/${knownImages.length}: ${imagePath}`); // Silenciar para não poluir
            
            try {
                const imageOption = document.createElement('div');
                imageOption.className = 'image-option';
                imageOption.dataset.image = imagePath;
                
                const imagePreview = document.createElement('div');
                imagePreview.className = 'image-preview';
                
                const img = document.createElement('img');
                img.src = imagePath;
                img.alt = imageName;
                img.loading = 'lazy';
                
                // Debug: add error handling to img
                img.onerror = () => {
                    // console.error(`❌ Failed to load fallback image: ${imagePath}`); // Silenciar
                    // Remove o elemento se a imagem não carregar
                    if (imageOption.parentNode) {
                        imageOption.parentNode.removeChild(imageOption);
                    }
                };
                
                img.onload = () => {
                    console.log(`✅ Fallback image loaded: ${imagePath}`);
                };
                
                imagePreview.appendChild(img);
                imageOption.appendChild(imagePreview);
                
                // Adicionar event listener
                imageOption.addEventListener('click', () => {
                    console.log(`🖱️ Clicked on fallback image: ${imagePath}`);
                    this.loadPredefinedImage(imagePath);
                });
                
                // Inserir após a opção de upload
                const nextSibling = uploadOption.nextSibling;
                if (nextSibling) {
                    imageOptions.insertBefore(imageOption, nextSibling);
                } else {
                    imageOptions.appendChild(imageOption);
                }
                
                addedCount++;
                
            } catch (error) {
                console.error(`❌ Error adding fallback image ${imageName}:`, error);
            }
        });
        
        console.log(`✅ Finished loading known images as fallback. Added: ${addedCount} placeholders`);
        
        // Verificar o estado final da modal
        setTimeout(() => {
            const finalImages = imageOptions.querySelectorAll('.image-option[data-image]');
            const workingImages = Array.from(finalImages).filter(img => {
                const imgElement = img.querySelector('img');
                return imgElement && imgElement.complete && imgElement.naturalWidth > 0;
            });
            console.log(`� Final count - Total: ${finalImages.length}, Working: ${workingImages.length}`);
        }, 2000);
    }

    hideImageSelectionModal() {
        const modal = document.getElementById('imageSelectionModal');
        modal.classList.add('hidden');
    }

    loadPredefinedImage(imagePath) {
        // Hide the modal
        this.hideImageSelectionModal();
        
        // Show loading indicator
        const uploadBtn = document.getElementById('uploadImageBtn');
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = 'Carregando...';
        uploadBtn.disabled = true;

        const img = new Image();
        img.onload = () => {
            // Convert white pixels to transparent for predefined images too
            this.convertWhiteToTransparent(img, (processedImg) => {
                this.currentImage = processedImg;
                this.showImageOverlay(processedImg);
                
                // Reset button
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
            });
        };
        
        img.onerror = () => {
            alert('Erro ao carregar a imagem. Tente novamente.');
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        };
        
        img.src = imagePath;
    }

    showImageOverlay(img) {
        this.isImageMode = true;
        const overlay = document.getElementById('imageOverlay');
        const imageContainer = overlay.querySelector('.image-container');
        const overlayImage = document.getElementById('overlayImage');
        
        // Get canvas position and dimensions
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvas.parentElement.getBoundingClientRect();
        
        // Calculate canvas offset within the container
        const canvasOffsetX = canvasRect.left - containerRect.left;
        const canvasOffsetY = canvasRect.top - containerRect.top;
        
        // Scale image to fit within canvas while maintaining aspect ratio
        const maxWidth = this.canvas.width * 0.5;
        const maxHeight = this.canvas.height * 0.5;
        
        let newWidth = img.naturalWidth;
        let newHeight = img.naturalHeight;
        
        if (newWidth > maxWidth) {
            newHeight = (newHeight * maxWidth) / newWidth;
            newWidth = maxWidth;
        }
        
        if (newHeight > maxHeight) {
            newWidth = (newWidth * maxHeight) / newHeight;
            newHeight = maxHeight;
        }
        
        this.imageSize = { width: newWidth, height: newHeight };
        
        // Position relative to canvas center
        const canvasScale = canvasRect.width / this.canvas.width;
        this.imagePosition = { 
            x: (this.canvas.width - newWidth) / 2, 
            y: (this.canvas.height - newHeight) / 2 
        };
        
        // Convert canvas coordinates to screen coordinates for overlay
        const screenX = canvasOffsetX + (this.imagePosition.x * canvasScale);
        const screenY = canvasOffsetY + (this.imagePosition.y * canvasScale);
        const screenWidth = newWidth * canvasScale;
        const screenHeight = newHeight * canvasScale;
        
        // Set overlay image properties with screen coordinates
        overlayImage.src = img.src;
        overlayImage.style.width = screenWidth + 'px';
        overlayImage.style.height = screenHeight + 'px';
        
        // Position the container instead of the image
        imageContainer.style.left = screenX + 'px';
        imageContainer.style.top = screenY + 'px';
        
        // Store scale factor for later use
        this.canvasScale = canvasScale;
        this.canvasOffset = { x: canvasOffsetX, y: canvasOffsetY };
        
        // Show overlay
        overlay.classList.remove('hidden');
        overlay.classList.add('active');
        
        // Disable drawing
        this.canvas.style.pointerEvents = 'none';
        
        this.setupImageInteraction();
    }

    setupImageInteraction() {
        const overlay = document.getElementById('imageOverlay');
        const imageContainer = overlay.querySelector('.image-container');
        const overlayImage = document.getElementById('overlayImage');
        const resizeHandles = document.querySelectorAll('.resize-handle');
        
        // Helper function to get event coordinates (mouse or touch)
        const getEventCoords = (e) => {
            if (e.touches && e.touches.length > 0) {
                return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
            }
            return { clientX: e.clientX, clientY: e.clientY };
        };
        
        // Image dragging - Mouse events (on the image itself)
        overlayImage.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            this.startImageDrag(e);
        });
        
        // Image dragging - Touch events (on the image itself)
        overlayImage.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            e.preventDefault(); // Prevent scrolling
            this.startImageDrag(e);
        });
        
        // Resize handles - Mouse and Touch events
        resizeHandles.forEach(handle => {
            // Mouse events
            handle.addEventListener('mousedown', (e) => {
                this.startImageResize(e, handle);
            });
            
            // Touch events
            handle.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling
                this.startImageResize(e, handle);
            });
        });
    }
    
    startImageDrag(e) {
        const coords = this.getEventCoords(e);
        this.isDraggingImage = true;
        const overlay = document.getElementById('imageOverlay');
        const imageContainer = overlay.querySelector('.image-container');
        const rect = imageContainer.getBoundingClientRect();
        this.dragOffset = {
            x: coords.clientX - rect.left,
            y: coords.clientY - rect.top
        };
        
        // Add both mouse and touch event listeners
        document.addEventListener('mousemove', this.handleImageDrag.bind(this));
        document.addEventListener('mouseup', this.handleImageDragEnd.bind(this));
        document.addEventListener('touchmove', this.handleImageDrag.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleImageDragEnd.bind(this));
        e.preventDefault();
    }
    
    startImageResize(e, handle) {
        this.isResizingImage = true;
        this.resizeHandle = handle.classList[1]; // nw, ne, sw, se
        
        // Add both mouse and touch event listeners
        document.addEventListener('mousemove', this.handleImageResize.bind(this));
        document.addEventListener('mouseup', this.handleImageResizeEnd.bind(this));
        document.addEventListener('touchmove', this.handleImageResize.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleImageResizeEnd.bind(this));
        e.preventDefault();
        e.stopPropagation();
    }
    
    getEventCoords(e) {
        if (e.touches && e.touches.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        return { clientX: e.clientX, clientY: e.clientY };
    }

    handleImageDrag(e) {
        if (!this.isDraggingImage) return;
        
        const coords = this.getEventCoords(e);
        
        // Calculate mouse position relative to container
        const containerRect = this.canvas.parentElement.getBoundingClientRect();
        const mouseX = coords.clientX - containerRect.left;
        const mouseY = coords.clientY - containerRect.top;
        
        // Convert to canvas coordinates
        const canvasX = (mouseX - this.canvasOffset.x - this.dragOffset.x) / this.canvasScale;
        const canvasY = (mouseY - this.canvasOffset.y - this.dragOffset.y) / this.canvasScale;
        
        // Keep image within canvas bounds
        const maxX = this.canvas.width - this.imageSize.width;
        const maxY = this.canvas.height - this.imageSize.height;
        
        this.imagePosition.x = Math.max(0, Math.min(maxX, canvasX));
        this.imagePosition.y = Math.max(0, Math.min(maxY, canvasY));
        
        // Convert back to screen coordinates for overlay display
        const screenX = this.canvasOffset.x + (this.imagePosition.x * this.canvasScale);
        const screenY = this.canvasOffset.y + (this.imagePosition.y * this.canvasScale);
        
        const overlay = document.getElementById('imageOverlay');
        const imageContainer = overlay.querySelector('.image-container');
        imageContainer.style.left = screenX + 'px';
        imageContainer.style.top = screenY + 'px';
        
        // Prevent default to avoid scrolling on touch devices
        e.preventDefault();
    }

    handleImageDragEnd() {
        this.isDraggingImage = false;
        // Remove all event listeners (both mouse and touch)
        document.removeEventListener('mousemove', this.handleImageDrag.bind(this));
        document.removeEventListener('mouseup', this.handleImageDragEnd.bind(this));
        document.removeEventListener('touchmove', this.handleImageDrag.bind(this));
        document.removeEventListener('touchend', this.handleImageDragEnd.bind(this));
    }

    handleImageResize(e) {
        if (!this.isResizingImage) return;
        
        const coords = this.getEventCoords(e);
        
        // Convert mouse position to canvas coordinates
        const containerRect = this.canvas.parentElement.getBoundingClientRect();
        const mouseCanvasX = (coords.clientX - containerRect.left - this.canvasOffset.x) / this.canvasScale;
        const mouseCanvasY = (coords.clientY - containerRect.top - this.canvasOffset.y) / this.canvasScale;
        
        let newWidth = this.imageSize.width;
        let newHeight = this.imageSize.height;
        let newX = this.imagePosition.x;
        let newY = this.imagePosition.y;
        
        switch (this.resizeHandle) {
            case 'se': // Southeast
                newWidth = mouseCanvasX - this.imagePosition.x;
                newHeight = mouseCanvasY - this.imagePosition.y;
                break;
            case 'sw': // Southwest
                newWidth = this.imagePosition.x + this.imageSize.width - mouseCanvasX;
                newHeight = mouseCanvasY - this.imagePosition.y;
                newX = mouseCanvasX;
                break;
            case 'ne': // Northeast
                newWidth = mouseCanvasX - this.imagePosition.x;
                newHeight = this.imagePosition.y + this.imageSize.height - mouseCanvasY;
                newY = mouseCanvasY;
                break;
            case 'nw': // Northwest
                newWidth = this.imagePosition.x + this.imageSize.width - mouseCanvasX;
                newHeight = this.imagePosition.y + this.imageSize.height - mouseCanvasY;
                newX = mouseCanvasX;
                newY = mouseCanvasY;
                break;
        }
        
        // Maintain aspect ratio
        const aspectRatio = this.currentImage.naturalWidth / this.currentImage.naturalHeight;
        if (newWidth / newHeight > aspectRatio) {
            newWidth = newHeight * aspectRatio;
        } else {
            newHeight = newWidth / aspectRatio;
        }
        
        // Minimum size constraints
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(50, newHeight);
        
        // Maximum size constraints (canvas bounds)
        newWidth = Math.min(this.canvas.width - newX, newWidth);
        newHeight = Math.min(this.canvas.height - newY, newHeight);
        
        // Update properties
        this.imageSize = { width: newWidth, height: newHeight };
        this.imagePosition = { x: newX, y: newY };
        
        // Convert to screen coordinates for display
        const screenX = this.canvasOffset.x + (newX * this.canvasScale);
        const screenY = this.canvasOffset.y + (newY * this.canvasScale);
        const screenWidth = newWidth * this.canvasScale;
        const screenHeight = newHeight * this.canvasScale;
        
        const overlay = document.getElementById('imageOverlay');
        const imageContainer = overlay.querySelector('.image-container');
        const overlayImage = document.getElementById('overlayImage');
        
        imageContainer.style.left = screenX + 'px';
        imageContainer.style.top = screenY + 'px';
        overlayImage.style.width = screenWidth + 'px';
        overlayImage.style.height = screenHeight + 'px';
        
        // Prevent default to avoid scrolling on touch devices
        e.preventDefault();
    }

    handleImageResizeEnd() {
        this.isResizingImage = false;
        this.resizeHandle = null;
        // Remove all event listeners (both mouse and touch)
        document.removeEventListener('mousemove', this.handleImageResize.bind(this));
        document.removeEventListener('mouseup', this.handleImageResizeEnd.bind(this));
        document.removeEventListener('touchmove', this.handleImageResize.bind(this));
        document.removeEventListener('touchend', this.handleImageResizeEnd.bind(this));
    }

    confirmImage() {
        if (!this.currentImage) return;
        
        // Generate unique ID for the image
        const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Convert image to base64 data URL
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.currentImage.naturalWidth;
        canvas.height = this.currentImage.naturalHeight;
        ctx.drawImage(this.currentImage, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        
        // Create floating image message
        const imageMessage = {
            type: 'FLOATING_IMAGE_ADD',
            roomId: this.currentRoom,
            imageId: imageId,
            imageData: imageData,
            imageX: this.imagePosition.x,
            imageY: this.imagePosition.y,
            imageWidth: this.imageSize.width,
            imageHeight: this.imageSize.height
        };
        
        // Send to all players
        this.sendWebSocketMessage(imageMessage);
        
        // Add to local display
        this.addFloatingImageLocal(imageMessage);
        
        // Clean up
        this.hideImageOverlay();
        
        // Clear file input
        document.getElementById('imageUpload').value = '';
    }

    cancelImage() {
        this.hideImageOverlay();
        document.getElementById('imageUpload').value = '';
    }

    hideImageOverlay() {
        this.isImageMode = false;
        this.currentImage = null;
        
        const overlay = document.getElementById('imageOverlay');
        overlay.classList.add('hidden');
        overlay.classList.remove('active');
        
        // Re-enable drawing
        this.canvas.style.pointerEvents = 'auto';
        
        // Clean up event listeners by replacing elements
        const imageContainer = overlay.querySelector('.image-container');
        const overlayImage = document.getElementById('overlayImage');
        const resizeHandles = document.querySelectorAll('.resize-handle');
        
        // Replace image to remove event listeners
        overlayImage.replaceWith(overlayImage.cloneNode(true));
        
        // Replace resize handles to remove event listeners
        resizeHandles.forEach(handle => {
            handle.replaceWith(handle.cloneNode(true));
        });
    }

    addFloatingImageLocal(imageMessage) {
        const container = document.getElementById('floatingImages');
        
        // Create floating image element
        const floatingImg = document.createElement('img');
        floatingImg.id = imageMessage.imageId;
        floatingImg.className = 'floating-image';
        floatingImg.src = imageMessage.imageData;
        
        // Store canvas coordinates in data attributes for repositioning
        floatingImg.dataset.canvasX = imageMessage.imageX;
        floatingImg.dataset.canvasY = imageMessage.imageY;
        floatingImg.dataset.canvasWidth = imageMessage.imageWidth;
        floatingImg.dataset.canvasHeight = imageMessage.imageHeight;
        
        // Get canvas position and scale for coordinate conversion
        const canvasRect = this.canvas.getBoundingClientRect();
        const canvasOffsetX = canvasRect.left;
        const canvasOffsetY = canvasRect.top;
        const canvasScale = this.canvas.width / canvasRect.width;
        
        // Convert canvas coordinates to screen coordinates
        // imageMessage coordinates are already in canvas pixels
        const screenX = canvasOffsetX + (imageMessage.imageX / canvasScale);
        const screenY = canvasOffsetY + (imageMessage.imageY / canvasScale);
        const screenWidth = imageMessage.imageWidth / canvasScale;
        const screenHeight = imageMessage.imageHeight / canvasScale;
        
        // Position the floating image relative to the page (not canvas container)
        floatingImg.style.position = 'fixed';
        floatingImg.style.left = screenX + 'px';
        floatingImg.style.top = screenY + 'px';
        floatingImg.style.width = screenWidth + 'px';
        floatingImg.style.height = screenHeight + 'px';
        
        container.appendChild(floatingImg);
        
        // console.log('Added floating image:', imageMessage.imageId, {
        //     canvasCoords: { x: imageMessage.imageX, y: imageMessage.imageY, w: imageMessage.imageWidth, h: imageMessage.imageHeight },
        //     screenCoords: { x: screenX, y: screenY, w: screenWidth, h: screenHeight },
        //     canvasRect: { x: canvasOffsetX, y: canvasOffsetY, scale: canvasScale }
        // });
    }

    removeFloatingImageLocal(imageId) {
        const floatingImg = document.getElementById(imageId);
        if (floatingImg) {
            floatingImg.remove();
            // console.log('Removed floating image:', imageId);
        }
    }

    clearFloatingImages() {
        const container = document.getElementById('floatingImages');
        container.innerHTML = '';
        // console.log('Cleared all floating images');
    }

    repositionFloatingImages() {
        const container = document.getElementById('floatingImages');
        const images = container.querySelectorAll('.floating-image');
        
        if (images.length === 0) return;
        
        // Get current canvas position and scale
        const canvasRect = this.canvas.getBoundingClientRect();
        const canvasOffsetX = canvasRect.left;
        const canvasOffsetY = canvasRect.top;
        const canvasScale = this.canvas.width / canvasRect.width;
        
        images.forEach(img => {
            // Get stored canvas coordinates from data attributes
            const canvasX = parseFloat(img.dataset.canvasX);
            const canvasY = parseFloat(img.dataset.canvasY);
            const canvasWidth = parseFloat(img.dataset.canvasWidth);
            const canvasHeight = parseFloat(img.dataset.canvasHeight);
            
            if (!isNaN(canvasX) && !isNaN(canvasY)) {
                // Recalculate screen position
                const screenX = canvasOffsetX + (canvasX / canvasScale);
                const screenY = canvasOffsetY + (canvasY / canvasScale);
                const screenWidth = canvasWidth / canvasScale;
                const screenHeight = canvasHeight / canvasScale;
                
                img.style.left = screenX + 'px';
                img.style.top = screenY + 'px';
                img.style.width = screenWidth + 'px';
                img.style.height = screenHeight + 'px';
            }
        });
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.game = new DrawingGame();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.game) {
        window.game.repositionFloatingImages();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.game && window.game.websocket) {
        window.game.websocket.close();
    }
});
