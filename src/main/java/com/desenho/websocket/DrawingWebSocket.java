package com.desenho.websocket;

import com.desenho.model.DrawingMessage;
import com.desenho.model.Room;
import com.desenho.service.RoomService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.websocket.server.ServerEndpointConfig;

@ServerEndpoint(value = "/drawing", configurator = DrawingWebSocketConfigurator.class)
@ApplicationScoped
public class DrawingWebSocket {

    private static final java.util.logging.Logger logger = java.util.logging.Logger.getLogger(DrawingWebSocket.class.getName());
    
    @Inject
    RoomService roomService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<Session, String> sessionToRoom = new ConcurrentHashMap<>();
    private final Map<Session, String> sessionToPlayer = new ConcurrentHashMap<>();
    private final Map<String, Map<Session, String>> roomSessions = new ConcurrentHashMap<>();
    
    @OnOpen
    public void onOpen(Session session) {
        // logger.info("New WebSocket connection opened: " + session.getId());
	session.setMaxTextMessageBufferSize(1024 * 1024* 10); // 1MB
        session.setMaxBinaryMessageBufferSize(1024 * 1024* 10); // 1MB
        session.setMaxIdleTimeout(300000); // 5 minutos timeout
    }
    
    @OnMessage
    public void onMessage(String message, Session session) {
        try {
             logger.info("Raw message received from session " + session.getId() + ": " + message);
            DrawingMessage drawingMessage = objectMapper.readValue(message, DrawingMessage.class);
             logger.info("Parsed message type: " + drawingMessage.getType() + " from session: " + session.getId());
            handleMessage(drawingMessage, session);
        } catch (Exception e) {
             logger.severe("Error processing message from session " + session.getId() + ": " + e.getMessage());
             logger.severe("Raw message was: " + message);
            sendErrorMessage(session, "Invalid message format");
        }
    }
    
    @OnClose
    public void onClose(Session session) {
        String roomId = sessionToRoom.get(session);
        String playerName = sessionToPlayer.get(session);
        
        if (roomId != null && playerName != null) {
            leaveRoom(roomId, playerName, session);
        }
        
        sessionToRoom.remove(session);
        sessionToPlayer.remove(session);
        logger.severe("WebSocket connection closed: " + session.getId());
    }
    
    @OnError
    public void onError(Session session, Throwable throwable) {
        logger.severe("WebSocket error for session " + session.getId() + ": " + throwable.getMessage());
    }
    
    private void handleMessage(DrawingMessage message, Session session) {
        switch (message.getType()) {
            case JOIN_ROOM:
                // logger.info("JOIN_ROOM request: " + message.getRoomId() + " player: " + message.getPlayerName() + " session: " + session.getId());
                joinRoom(message.getRoomId(), message.getPlayerName(), session);
                break;
            case LEAVE_ROOM:
                leaveRoom(message.getRoomId(), message.getPlayerName(), session);
                break;
            case CANVAS_UPDATE:
                updateCanvas(message.getRoomId(), message.getCanvasData(), session);
                break;
            case FORCE_CANVAS_UPDATE:
                forceUpdateCanvas(message.getRoomId(), message.getCanvasData(), session);
                break;
            case DRAWING_ACTION:
                broadcastDrawingAction(message, session);
                break;
            case CLEAR_CANVAS:
                clearCanvas(message.getRoomId(), session);
                break;
            case FLOATING_IMAGE_ADD:
                addFloatingImage(message, session);
                break;
            case FLOATING_IMAGE_REMOVE:
                removeFloatingImage(message, session);
                break;
            default:
                // logger.warning("Unknown message type: " + message.getType() + " from session: " + session.getId());
                sendErrorMessage(session, "Unknown message type");
        }
    }
    
    private void joinRoom(String roomId, String playerName, Session session) {
        // logger.info("Attempting to join room: " + roomId + " with player: " + playerName + " session: " + session.getId());
        
        // Check if player name is already taken in this room
        Room room = roomService.getRoom(roomId);
        if (room != null && room.getPlayers().contains(playerName)) {
            // logger.warning("Player name " + playerName + " already exists in room " + roomId);
            sendErrorMessage(session, "Nome já está sendo usado nesta sala");
            return;
        }
        
        // Remove from previous room if any
        String previousRoom = sessionToRoom.get(session);
        if (previousRoom != null) {
            // logger.info("Removing player from previous room: " + previousRoom);
            leaveRoom(previousRoom, sessionToPlayer.get(session), session);
        }
        
        // Add to new room
        // logger.info("Adding player " + playerName + " to room " + roomId);
        roomService.addPlayerToRoom(roomId, playerName);
        sessionToRoom.put(session, roomId);
        sessionToPlayer.put(session, playerName);
        
        // Add session to room sessions
        roomSessions.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>()).put(session, playerName);
        // logger.info("Added session to roomSessions. Room " + roomId + " now has " + roomSessions.get(roomId).size() + " sessions");
        
        // Send current canvas data to the new player
        room = roomService.getRoom(roomId);
        if (room != null && room.getCanvasData() != null && !room.getCanvasData().isEmpty()) {
            // logger.info("Sending existing canvas data to new player");
            sendCanvasData(session, room.getCanvasData());
        } else {
            // logger.info("No existing canvas data found for room " + roomId);
        }

        // Send existing floating images to the new player
        for (DrawingMessage img : roomService.getFloatingImages(roomId)) {
            sendMessage(session, img);
        }
        
        // Broadcast updated player list
        broadcastPlayerList(roomId);
        
        // logger.info("Player " + playerName + " successfully joined room " + roomId);
    }
    
    private void leaveRoom(String roomId, String playerName, Session session) {
        roomService.removePlayerFromRoom(roomId, playerName);
        
        // Remove session from room sessions
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                roomSessions.remove(roomId);
            }
        }
        
        // Broadcast updated player list
        broadcastPlayerList(roomId);
        
        // logger.info("Player " + playerName + " left room " + roomId);
    }
    
    private void updateCanvas(String roomId, String canvasData, Session session) {
        roomService.updateRoomCanvas(roomId, canvasData);
        
        // Broadcast canvas update to all other players in the room
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            DrawingMessage message = new DrawingMessage();
            message.setType(DrawingMessage.MessageType.CANVAS_UPDATE);
            message.setRoomId(roomId);
            message.setCanvasData(canvasData);
            
            sessions.keySet().forEach(s -> {
                if (!s.equals(session)) {
                    sendMessage(s, message);
                }
            });
        }
    }
    
    private void forceUpdateCanvas(String roomId, String canvasData, Session session) {
        roomService.updateRoomCanvas(roomId, canvasData);
        
        // Broadcast FORCE canvas update to all other players in the room (for image uploads)
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            DrawingMessage message = new DrawingMessage();
            message.setType(DrawingMessage.MessageType.FORCE_CANVAS_UPDATE);
            message.setRoomId(roomId);
            message.setCanvasData(canvasData);
            
            sessions.keySet().forEach(s -> {
                if (!s.equals(session)) {
                    sendMessage(s, message);
                }
            });
        }
        // logger.info("Force canvas update broadcasted to " + (sessions != null ? sessions.size() - 1 : 0) + " other players in room " + roomId);
    }
    
    private void broadcastDrawingAction(DrawingMessage message, Session session) {
        String roomId = message.getRoomId();
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            sessions.keySet().forEach(s -> {
                if (!s.equals(session)) {
                    sendMessage(s, message);
                }
            });
        }
    }
    
    private void clearCanvas(String roomId, Session session) {
        roomService.updateRoomCanvas(roomId, null);
        
        // Broadcast clear canvas to all players in the room
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            DrawingMessage message = new DrawingMessage();
            message.setType(DrawingMessage.MessageType.CLEAR_CANVAS);
            message.setRoomId(roomId);
            
            sessions.keySet().forEach(s -> sendMessage(s, message));
        }
    }
    
    private void broadcastPlayerList(String roomId) {
        Room room = roomService.getRoom(roomId);
        if (room == null) return;
        
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            DrawingMessage message = new DrawingMessage();
            message.setType(DrawingMessage.MessageType.PLAYER_LIST_UPDATE);
            message.setRoomId(roomId);
            message.setPlayerName(String.join(",", room.getPlayers()));
            
            sessions.keySet().forEach(s -> sendMessage(s, message));
        }
    }
    
    private void sendCanvasData(Session session, String canvasData) {
        DrawingMessage message = new DrawingMessage();
        message.setType(DrawingMessage.MessageType.CANVAS_UPDATE);
        message.setCanvasData(canvasData);
        sendMessage(session, message);
    }
    
    private void sendMessage(Session session, DrawingMessage message) {
        try {
            if (session.isOpen()) {
                // Use async remote to avoid blocking IO thread
                session.getAsyncRemote().sendText(objectMapper.writeValueAsString(message));
            }
        } catch (Exception e) {
            logger.severe("Error sending message to session " + session.getId() + ": " + e.getMessage());
        }
    }
    
    private void addFloatingImage(DrawingMessage message, Session sender) {
        String roomId = message.getRoomId();
        logger.info("Adding floating image to room: " + roomId + " imageId: " + message.getImageId());
        
        // Verify sender is in the room
        String senderRoom = sessionToRoom.get(sender);
        if (!roomId.equals(senderRoom)) {
            logger.warning("Session " + sender.getId() + " trying to add image to room " + roomId + " but is in room " + senderRoom);
            sendErrorMessage(sender, "Você não está na sala especificada");
            return;
        }
        
        // Store image in room state (service will assign an ID if needed)
        roomService.addFloatingImage(roomId, message);

        // Broadcast to all users in the room (including sender for confirmation)
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            logger.info("Broadcasting floating image to " + sessions.size() + " sessions in room " + roomId);
            sessions.keySet().forEach(s -> {
                 logger.info("Sending floating image to session " + s.getId() + " in room " + roomId);
                sendMessage(s, message);
            });
        } else {
            logger.warning("No sessions found for room " + roomId);
        }
    }

    private void removeFloatingImage(DrawingMessage message, Session sender) {
        String roomId = message.getRoomId();
        // logger.info("Removing floating image from room: " + roomId + " imageId: " + message.getImageId());

        // Remove from room state
        roomService.removeFloatingImage(roomId, message.getImageId());

        // Broadcast to all users in the room
        broadcastToRoom(roomId, message, sender);
    }
    
    private void broadcastToRoom(String roomId, DrawingMessage message, Session sender) {
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            sessions.keySet().forEach(s -> {
                if (!s.equals(sender)) {
                    sendMessage(s, message);
                }
            });
        }
    }
    
    private void sendErrorMessage(Session session, String error) {
        try {
            if (session.isOpen()) {
                // Use async remote to avoid blocking IO thread
                session.getAsyncRemote().sendText("{\"error\":\"" + error + "\"}");
            }
        } catch (Exception e) {
            logger.severe("Error sending error message: " + e.getMessage());
        }
    }
}
