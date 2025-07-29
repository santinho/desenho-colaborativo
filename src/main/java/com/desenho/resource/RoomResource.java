package com.desenho.resource;

import com.desenho.service.RoomService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

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
}
