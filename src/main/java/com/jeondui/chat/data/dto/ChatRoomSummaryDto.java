package com.jeondui.chat.data.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChatRoomSummaryDto {
    private Long id;
    private String name;
    private Long participantCount;
}
