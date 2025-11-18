package com.jeondui.chat.data.repository;

import com.jeondui.chat.data.entity.ChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findTop50ByRoomIdOrderByCreatedAtDesc(Long roomId);
}
