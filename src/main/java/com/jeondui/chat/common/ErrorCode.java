package com.jeondui.chat.common;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 4xx 영역
    CHAT_ROOM_NOT_FOUND("CHAT_404_001", "채팅방이 존재하지 않습니다."),
    NOT_CHAT_ROOM_PARTICIPANT("CHAT_403_001", "채팅방에 참여 중인 사용자만 메시지를 보낼 수 있습니다.");

    private final String code;
    private final String message;

}
