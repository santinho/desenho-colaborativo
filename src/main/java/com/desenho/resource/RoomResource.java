package com.desenho.resource;

import com.desenho.service.RoomService;
import com.desenho.model.Room;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import java.util.HashMap;

@Path("/api/rooms")
public class RoomResource {
    
    @Inject
    RoomService roomService;
    
    @POST
    @Path("/create")
    @Produces(MediaType.APPLICATION_JSON)
    public Response createRoom() {
        String roomId = roomService.createRoom();
        return Response.ok()
                .entity("{\"roomId\":\"" + roomId + "\"}")
                .build();
    }
    
    @GET
    @Path("/health")
    @Produces(MediaType.TEXT_PLAIN)
    public String health() {
        return "Drawing service is running!";
    }
    
    @GET
    @Path("/status")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getStatus() {
        Map<String, Object> status = new HashMap<>();
        Map<String, Room> allRooms = roomService.getAllRooms();
        
        status.put("activeRooms", roomService.getActiveRoomsCount());
        status.put("totalPlayers", roomService.getTotalPlayersCount());
        status.put("rooms", convertRoomsToResponse(allRooms));
        
        return Response.ok(status).build();
    }
    
    @GET
    @Path("/users")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getLoggedUsers() {
        Map<String, Room> allRooms = roomService.getAllRooms();
        Map<String, Object> response = new HashMap<>();
        
        response.put("totalUsers", roomService.getTotalPlayersCount());
        response.put("activeRooms", roomService.getActiveRoomsCount());
        response.put("roomDetails", convertRoomsToResponse(allRooms));
        
        return Response.ok(response).build();
    }
    
    private Map<String, Object> convertRoomsToResponse(Map<String, Room> rooms) {
        Map<String, Object> roomsResponse = new HashMap<>();
        
        for (Map.Entry<String, Room> entry : rooms.entrySet()) {
            String roomId = entry.getKey();
            Room room = entry.getValue();
            
            Map<String, Object> roomInfo = new HashMap<>();
            roomInfo.put("players", room.getPlayers());
            roomInfo.put("playerCount", room.getPlayers().size());
            roomInfo.put("hasCanvas", room.getCanvasData() != null);
            
            roomsResponse.put(roomId, roomInfo);
        }
        
        return roomsResponse;
    }
}
