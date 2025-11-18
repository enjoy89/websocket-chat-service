# 실시간 채팅 서비스

## 개요
- WebSocket + STOMP 프로토콜을 이용해 실시간 양방향 통신을 구현한 토이 프로젝트
- STOMP 기반의 pub/sub 구조를 활용하여 채팅방 구독, 입장/퇴장 이벤트, 실시간 메시지 전송 등의 기능을 제공

## 주요 기능
| 기능 | 설명 |
|------|------|
| **채팅방 목록 조회** | 생성된 모든 채팅방 조회, 각 방의 실시간 참여자 수 표시 |
| **채팅방 생성** | 방 이름 입력 → REST API로 신규 채팅방 생성 |
| **채팅방 입장** | “입장” 버튼을 눌러 STOMP 구독 + 입장 이벤트 브로드캐스트 |
| **실시간 채팅 (TALK)** | WebSocket + STOMP 기반 양방향 메시지 전송 (브로드캐스트) |
| **입장 메시지 (ENTER)** | “OO님이 입장하셨습니다.” 시스템 메시지 자동 생성 & 전송 |
| **퇴장 및 구독 해제 (LEAVE)** | “OO님이 퇴장하셨습니다.” 공지 생성 + 참여자 목록에서 제거 |
| **최근 메시지 조회** | 방 입장 시 REST API로 최근 50개 메시지 사전 로딩 |
| **실시간 참여자 수 표시** | `chat_room_participant` 테이블 기반 현재 참여자 수 표시 |
| **참여자 중복 입장 방지** | 이미 참여 중인 유저는 ENTER 메시지 중복 생성하지 않음 |
| **퇴장 후 메시지 전송 제한** | 퇴장한 상태에서는 메시지 전송 불가 → 다시 “입장”해야 가능 |

## 사용 기술 스택
| 분야 | 기술 |
|------|------|
| **Language** | Java 21 |
| **Backend** | Spring Boot |
| **WebSocket 프로토콜** | STOMP, SockJS |
| **ORM / JPA** | Spring Data JPA, Hibernate |
| **DB** | MySQL |
| **빌드 도구** | Gradle |
| **Frontend** | HTML, CSS, JavaScript (Vanilla) |
| **실시간 메시징** | Spring WebSocket, SimpMessagingTemplate |
| **개발 환경** | IntelliJ IDEA, Git, GitHub |
