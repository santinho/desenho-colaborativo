package com.desenho.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DrawingMessage {
    
    @JsonProperty("type")
    private MessageType type;
    
    @JsonProperty("roomId")
    private String roomId;
    
    @JsonProperty("playerName")
    private String playerName;
    
    @JsonProperty("canvasData")
    private String canvasData;
    
    @JsonProperty("drawingAction")
    private DrawingAction drawingAction;
    
    public enum MessageType {
        JOIN_ROOM,
        LEAVE_ROOM,
        CANVAS_UPDATE,
        DRAWING_ACTION,
        CLEAR_CANVAS,
        PLAYER_LIST_UPDATE
    }
    
    public static class DrawingAction {
        @JsonProperty("tool")
        private String tool;
        
        @JsonProperty("color")
        private String color;
        
        @JsonProperty("size")
        private int size;
        
        @JsonProperty("startX")
        private double startX;
        
        @JsonProperty("startY")
        private double startY;
        
        @JsonProperty("endX")
        private double endX;
        
        @JsonProperty("endY")
        private double endY;
        
        @JsonProperty("isStart")
        private boolean isStart;
        
        @JsonProperty("isEnd")
        private boolean isEnd;

        // Getters and Setters
        public String getTool() { return tool; }
        public void setTool(String tool) { this.tool = tool; }
        
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        
        public int getSize() { return size; }
        public void setSize(int size) { this.size = size; }
        
        public double getStartX() { return startX; }
        public void setStartX(double startX) { this.startX = startX; }
        
        public double getStartY() { return startY; }
        public void setStartY(double startY) { this.startY = startY; }
        
        public double getEndX() { return endX; }
        public void setEndX(double endX) { this.endX = endX; }
        
        public double getEndY() { return endY; }
        public void setEndY(double endY) { this.endY = endY; }
        
        public boolean isStart() { return isStart; }
        public void setStart(boolean start) { isStart = start; }
        
        public boolean isEnd() { return isEnd; }
        public void setEnd(boolean end) { isEnd = end; }
    }

    // Getters and Setters
    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
    
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    
    public String getPlayerName() { return playerName; }
    public void setPlayerName(String playerName) { this.playerName = playerName; }
    
    public String getCanvasData() { return canvasData; }
    public void setCanvasData(String canvasData) { this.canvasData = canvasData; }
    
    public DrawingAction getDrawingAction() { return drawingAction; }
    public void setDrawingAction(DrawingAction drawingAction) { this.drawingAction = drawingAction; }
}
