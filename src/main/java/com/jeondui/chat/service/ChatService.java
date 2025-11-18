package com.jeondui.chat.service;

import com.jeondui.chat.common.ChatServiceException;
import com.jeondui.chat.common.ErrorCode;
import com.jeondui.chat.common.MessageType;
import com.jeondui.chat.data.dto.ChatMessageDto;
import com.jeondui.chat.data.dto.ChatRoomSummaryDto;
import com.jeondui.chat.data.entity.ChatMessage;
import com.jeondui.chat.data.entity.ChatRoom;
import com.jeondui.chat.data.entity.ChatRoomParticipant;
import com.jeondui.chat.data.repository.ChatMessageRepository;
import com.jeondui.chat.data.repository.ChatRoomParticipantRepository;
import com.jeondui.chat.data.repository.ChatRoomRepository;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomParticipantRepository participantRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void enterRoom(ChatMessageDto messageDto) {
        ChatRoom room = chatRoomRepository.findById(messageDto.getRoomId())
                .orElseThrow(() -> new ChatServiceException(ErrorCode.CHAT_ROOM_NOT_FOUND, "roomId = " + messageDto.getRoomId()));

        // 현재 방에 이미 참여 중인지 확인
        Optional<ChatRoomParticipant> existing = participantRepository.findByRoomIdAndSender(room.getId(), messageDto.getSender());
        if (existing.isPresent()) {
            log.info("이미 참여 중인 유저. 입장 공지 생략: roomId={}, sender={}", room.getId(), messageDto.getSender());
            return;
        }

        // 신규 참여자 등록
        ChatRoomParticipant participant = ChatRoomParticipant.builder()
                .room(room)
                .sender(messageDto.getSender())
                .joinedAt(LocalDateTime.now())
                .build();
        participantRepository.save(participant);

        // 현재 참여자 수
        long participantCount = participantRepository.countByRoomId(room.getId());

        String notice = messageDto.getSender() + "님이 입장하셨습니다.";
        ChatMessage chatMessage = ChatMessage.builder()
                .room(room)
                .type(MessageType.ENTER)
                .sender(messageDto.getSender())
                .content(notice)
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageRepository.save(chatMessage);

        // 클라이언트 반환용 dto
        ChatMessageDto responseDto = ChatMessageDto.builder()
                .type(MessageType.ENTER)
                .roomId(room.getId())
                .sender(messageDto.getSender())
                .content(notice)
                .createdAt(chatMessage.getCreatedAt())
                .participantCount(participantCount)
                .build();

        // 구독 중인 클아이언트에게 브로드캐스트
        messagingTemplate.convertAndSend(
                "/topic/room" + messageDto.getRoomId(),
                responseDto
        );
    }

    public void sendMessage(ChatMessageDto messageDto) {
        ChatRoom room = chatRoomRepository.findById(messageDto.getRoomId())
                .orElseThrow(() -> new ChatServiceException(ErrorCode.CHAT_ROOM_NOT_FOUND, "roomId= " + messageDto.getRoomId()));

        boolean joined = participantRepository
                .findByRoomIdAndSender(room.getId(), messageDto.getSender())
                .isPresent();

        if (!joined) {
            log.warn("참여 중이 아닌 사용자의 메시지 전송 시도: roomId={}, sender={}", room.getId(), messageDto.getSender());
            return; // 무시
        }

        ChatMessage chatMessage = ChatMessage.builder()
                .room(room)
                .type(MessageType.TALK)
                .sender(messageDto.getSender())
                .content(messageDto.getContent())
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageRepository.save(chatMessage);

        // 클라이언트 반환용 dto
        ChatMessageDto responseDto = ChatMessageDto.builder()
                .type(MessageType.TALK)
                .roomId(room.getId())
                .sender(messageDto.getSender())
                .content(messageDto.getContent())
                .createdAt(chatMessage.getCreatedAt())
                .build();

        messagingTemplate.convertAndSend(
                "/topic/room" + messageDto.getRoomId(),
                responseDto
        );
    }

    public List<ChatMessageDto> getRecentMessages(Long roomId, int size) {
        List<ChatMessage> messages = chatMessageRepository.findTop50ByRoomIdOrderByCreatedAtDesc(roomId);

        // 오래된 것부터 보내기
        Collections.reverse(messages);

        return messages.stream()
                .limit(size)
                .map(m -> ChatMessageDto.builder()
                        .type(MessageType.valueOf(m.getType().name()))
                        .roomId(m.getRoom().getId())
                        .sender(m.getSender())
                        .content(m.getContent())
                        .createdAt(m.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public void leaveRoom(ChatMessageDto messageDto) {
        ChatRoom room = chatRoomRepository.findById(messageDto.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 존재하지 않습니다. id = " + messageDto.getRoomId()));

        // 참여 중이 아니면 그냥 무시
        Optional<ChatRoomParticipant> existing = participantRepository.findByRoomIdAndSender(room.getId(), messageDto.getSender());

        if (existing.isEmpty()) {
            log.info("이미 참여하지 않는 유저입니다. 퇴장 공지 생략: roomId={}, sender={}", room.getId(), messageDto.getSender());
            return;
        }

        // 참여자 삭제
        ChatRoomParticipant participant = existing.get();
        participantRepository.deleteByRoomIdAndSender(participant.getRoom().getId(), participant.getSender());

        // 삭제 후 현재 참여자 수
        long participantCount = participantRepository.countByRoomId(room.getId());

        String notice = messageDto.getSender() + "님이 퇴장하셨습니다.";
        ChatMessage chatMessage = ChatMessage.builder()
                .room(room)
                .type(MessageType.LEAVE)
                .sender(messageDto.getSender())
                .content(notice)
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageRepository.save(chatMessage);

        ChatMessageDto responseDto = ChatMessageDto.builder()
                .type(MessageType.LEAVE)
                .roomId(room.getId())
                .sender(messageDto.getSender())
                .content(notice)
                .createdAt(chatMessage.getCreatedAt())
                .participantCount(participantCount)
                .build();

        messagingTemplate.convertAndSend(
                "/topic/room" + messageDto.getRoomId(),
                responseDto);
    }

    public void createRoom(String name) {
        ChatRoom room = ChatRoom.builder()
                .name(name)
                .build();
        chatRoomRepository.save(room);
    }

    public List<ChatRoomSummaryDto> getRooms() {
        List<ChatRoom> rooms = chatRoomRepository.findAll();

        return rooms.stream().map(room -> new ChatRoomSummaryDto(
                room.getId(),
                room.getName(),
                participantRepository.countByRoomId(room.getId()))).toList();
    }
}
