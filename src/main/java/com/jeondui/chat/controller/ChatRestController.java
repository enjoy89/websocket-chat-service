package com.jeondui.chat.controller;

import com.jeondui.chat.data.dto.ChatMessageDto;
import com.jeondui.chat.data.dto.ChatRoomSummaryDto;
import com.jeondui.chat.service.ChatService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat/rooms")
public class ChatRestController {

    private final ChatService chatService;

    @GetMapping
    public List<ChatRoomSummaryDto> getRooms() {
        return chatService.getRooms();
    }

    @PostMapping
    public void createRoom(@RequestParam String name) {
        chatService.createRoom(name);
    }

    @GetMapping("/{roomId}/messages")
    public List<ChatMessageDto> getChatMessages(@PathVariable Long roomId,
                                                @RequestParam(defaultValue = "50") int size) {
        return chatService.getRecentMessages(roomId, size);
    }
}
