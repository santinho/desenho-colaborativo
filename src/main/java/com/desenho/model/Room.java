package com.desenho.model;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public class Room {
    private String roomId;
    private Set<String> players;
    private String canvasData;
    private long lastUpdate;
    
    public Room(String roomId) {
        this.roomId = roomId;
        this.players = ConcurrentHashMap.newKeySet();
        this.canvasData = null;
        this.lastUpdate = System.currentTimeMillis();
    }
    
    public void addPlayer(String playerName) {
        players.add(playerName);
        updateTimestamp();
    }
    
    public void removePlayer(String playerName) {
        players.remove(playerName);
        updateTimestamp();
    }
    
    public boolean isEmpty() {
        return players.isEmpty();
    }
    
    public void updateCanvas(String canvasData) {
        this.canvasData = canvasData;
        updateTimestamp();
    }
    
    private void updateTimestamp() {
        this.lastUpdate = System.currentTimeMillis();
    }
    
    // Getters and Setters
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    
    public Set<String> getPlayers() { return players; }
    public void setPlayers(Set<String> players) { this.players = players; }
    
    public String getCanvasData() { return canvasData; }
    public void setCanvasData(String canvasData) { this.canvasData = canvasData; }
    
    public long getLastUpdate() { return lastUpdate; }
    public void setLastUpdate(long lastUpdate) { this.lastUpdate = lastUpdate; }
}
