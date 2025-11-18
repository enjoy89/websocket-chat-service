package com.jeondui.chat.common;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class ChatServiceException extends RuntimeException {

    private final ErrorCode errorCode;

    public ChatServiceException(ErrorCode errorCode, String detailMessage) {
        super(detailMessage);
        this.errorCode = errorCode;
    }

}
