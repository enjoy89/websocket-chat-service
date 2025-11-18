package com.jeondui.chat.data.repository;

import com.jeondui.chat.data.entity.ChatRoomParticipant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomParticipantRepository extends JpaRepository<com.jeondui.chat.data.entity.ChatRoomParticipant, Long> {

    long countByRoomId(Long roomId);

    Optional<ChatRoomParticipant> findByRoomIdAndSender(Long roomId, String sender);

    void deleteByRoomIdAndSender(Long roomId, String sender);
}
