package com.desenho.service;

import com.desenho.model.Room;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Random;

@ApplicationScoped
public class RoomService {
    
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final Random random = new Random();
    
    public String createRoom() {
        String roomId = generateRoomCode();
        while (rooms.containsKey(roomId)) {
            roomId = generateRoomCode();
        }
        rooms.put(roomId, new Room(roomId));
        return roomId;
    }
    
    public Room getRoom(String roomId) {
        return rooms.get(roomId);
    }
    
    public Room getOrCreateRoom(String roomId) {
        return rooms.computeIfAbsent(roomId, Room::new);
    }
    
    public void removeRoom(String roomId) {
        rooms.remove(roomId);
    }
    
    public void addPlayerToRoom(String roomId, String playerName) {
        Room room = getOrCreateRoom(roomId);
        room.addPlayer(playerName);
    }
    
    public void removePlayerFromRoom(String roomId, String playerName) {
        Room room = getRoom(roomId);
        if (room != null) {
            room.removePlayer(playerName);
            if (room.isEmpty()) {
                removeRoom(roomId);
            }
        }
    }
    
    public boolean isPlayerInRoom(String roomId, String playerName) {
        Room room = getRoom(roomId);
        return room != null && room.getPlayers().contains(playerName);
    }
    
    public void updateRoomCanvas(String roomId, String canvasData) {
        Room room = getRoom(roomId);
        if (room != null) {
            room.updateCanvas(canvasData);
        }
    }
    
    private String generateRoomCode() {
        StringBuilder code = new StringBuilder();
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for (int i = 0; i < 6; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }
        return code.toString();
    }
    
    // Cleanup empty rooms periodically
    public void cleanupEmptyRooms() {
        rooms.entrySet().removeIf(entry -> entry.getValue().isEmpty());
    }
}
