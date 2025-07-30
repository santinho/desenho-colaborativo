package com.desenho.websocket;

import com.desenho.model.DrawingMessage;
import com.desenho.model.Room;
import com.desenho.service.RoomService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

@ServerEndpoint("/drawing")
@ApplicationScoped
public class DrawingWebSocket {
    
    private static final Logger logger = Logger.getLogger(DrawingWebSocket.class.getName());
    
    @Inject
    RoomService roomService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<Session, String> sessionToRoom = new ConcurrentHashMap<>();
    private final Map<Session, String> sessionToPlayer = new ConcurrentHashMap<>();
    private final Map<String, Map<Session, String>> roomSessions = new ConcurrentHashMap<>();
    
    @OnOpen
    public void onOpen(Session session) {
        logger.info("New WebSocket connection opened: " + session.getId());
    }
    
    @OnMessage
    public void onMessage(String message, Session session) {
        try {
            logger.info("Received message: " + message + " from session: " + session.getId());
            DrawingMessage drawingMessage = objectMapper.readValue(message, DrawingMessage.class);
            handleMessage(drawingMessage, session);
        } catch (Exception e) {
            logger.severe("Error processing message: " + e.getMessage());
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
        logger.info("WebSocket connection closed: " + session.getId());
    }
    
    @OnError
    public void onError(Session session, Throwable throwable) {
        logger.severe("WebSocket error for session " + session.getId() + ": " + throwable.getMessage());
    }
    
    private void handleMessage(DrawingMessage message, Session session) {
        logger.info("Handling message: " + message.getType() + " from session: " + session.getId());
        switch (message.getType()) {
            case JOIN_ROOM:
                joinRoom(message.getRoomId(), message.getPlayerName(), session);
                break;
            case LEAVE_ROOM:
                leaveRoom(message.getRoomId(), message.getPlayerName(), session);
                break;
            case CANVAS_UPDATE:
                updateCanvas(message.getRoomId(), message.getCanvasData(), session);
                break;
            case DRAWING_ACTION:
                logger.info("Broadcasting drawing action for room: " + message.getRoomId());
                broadcastDrawingAction(message, session);
                break;
            case CLEAR_CANVAS:
                clearCanvas(message.getRoomId(), session);
                break;
            default:
                sendErrorMessage(session, "Unknown message type");
        }
    }
    
    private void joinRoom(String roomId, String playerName, Session session) {
        logger.info("Attempting to join room: " + roomId + " with player: " + playerName + " session: " + session.getId());
        
        // Check if player name is already taken in this room
        Room room = roomService.getRoom(roomId);
        if (room != null && room.getPlayers().contains(playerName)) {
            logger.warning("Player name " + playerName + " already exists in room " + roomId);
            sendErrorMessage(session, "Nome já está sendo usado nesta sala");
            return;
        }
        
        // Remove from previous room if any
        String previousRoom = sessionToRoom.get(session);
        if (previousRoom != null) {
            logger.info("Removing player from previous room: " + previousRoom);
            leaveRoom(previousRoom, sessionToPlayer.get(session), session);
        }
        
        // Add to new room
        logger.info("Adding player " + playerName + " to room " + roomId);
        roomService.addPlayerToRoom(roomId, playerName);
        sessionToRoom.put(session, roomId);
        sessionToPlayer.put(session, playerName);
        
        // Add session to room sessions
        roomSessions.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>()).put(session, playerName);
        logger.info("Added session to roomSessions. Room " + roomId + " now has " + roomSessions.get(roomId).size() + " sessions");
        
        // Send current canvas data to the new player
        room = roomService.getRoom(roomId);
        if (room != null && room.getCanvasData() != null) {
            logger.info("Sending existing canvas data to new player");
            sendCanvasData(session, room.getCanvasData());
        }
        
        // Broadcast updated player list
        broadcastPlayerList(roomId);
        
        logger.info("Player " + playerName + " successfully joined room " + roomId);
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
        
        logger.info("Player " + playerName + " left room " + roomId);
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
    
    private void broadcastDrawingAction(DrawingMessage message, Session session) {
        String roomId = message.getRoomId();
        logger.info("Broadcasting drawing action to room: " + roomId);
        Map<Session, String> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            logger.info("Found " + sessions.size() + " sessions in room " + roomId);
            sessions.keySet().forEach(s -> {
                if (!s.equals(session)) {
                    logger.info("Sending drawing action to session: " + s.getId());
                    sendMessage(s, message);
                }
            });
        } else {
            logger.warning("No sessions found for room: " + roomId);
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
                session.getBasicRemote().sendText(objectMapper.writeValueAsString(message));
            }
        } catch (IOException e) {
            logger.severe("Error sending message to session " + session.getId() + ": " + e.getMessage());
        }
    }
    
    private void sendErrorMessage(Session session, String error) {
        try {
            if (session.isOpen()) {
                session.getBasicRemote().sendText("{\"error\":\"" + error + "\"}");
            }
        } catch (IOException e) {
            logger.severe("Error sending error message: " + e.getMessage());
        }
    }
}
