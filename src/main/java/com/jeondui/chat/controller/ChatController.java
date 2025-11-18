package com.jeondui.chat.controller;

import com.jeondui.chat.data.dto.ChatMessageDto;
import com.jeondui.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;

    @MessageMapping("/chat.enter")
    public void enter(ChatMessageDto messageDto) {
        log.info("채팅방 입장: {}", messageDto);
        chatService.enterRoom(messageDto);
    }

    @MessageMapping("/chat.send")
    public void sendMessage(ChatMessageDto messageDto) {
        log.info("메시지 수신: {}", messageDto);
        chatService.sendMessage(messageDto);
    }

    @MessageMapping("/chat.leave")
    public void leave(ChatMessageDto messageDto) {
        log.info("채팅방 퇴장: {}", messageDto);
        chatService.leaveRoom(messageDto);
    }
}
