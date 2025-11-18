package com.jeondui.chat.data.dto;

import com.jeondui.chat.common.MessageType;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {

    private MessageType type;
    private Long roomId;
    private String sender;
    private String content;
    private Long participantCount;
    private LocalDateTime createdAt;

}
