let stompClient = null;
let currentRoomId = null;
let currentRoomName = '';
let currentSubscription = null;
let isJoinedCurrentRoom = false;

// --- 공통 유틸 ---

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function updateRoomParticipantCount(roomId, count) {
    const list = document.getElementById('roomList').children;
    for (const item of list) {
        if (item.dataset.roomId === String(roomId)) {
            const sub = item.querySelector('.room-item-sub');
            if (sub) {
                sub.textContent = `ID: ${roomId} · 참여자 ${count}명`;
            }
            break;
        }
    }
}

function changeRoomParticipantCount(roomId, delta) {
    const list = document.getElementById('roomList').children;
    for (const item of list) {
        if (item.dataset.roomId === String(roomId)) {
            const sub = item.querySelector('.room-item-sub');
            if (!sub) return;

            // 텍스트에서 숫자만 뽑기: "ID: 1 · 참여자 3명"
            const match = sub.textContent.match(/참여자\s+(\d+)명/);
            if (!match) return;

            const current = parseInt(match[1], 10);
            const next = Math.max(current + delta, 0);

            // 텍스트 다시 세팅
            sub.textContent = `ID: ${roomId} · 참여자 ${next}명`;
            break;
        }
    }
}

function appendMessage(msg, isMe) {
    const container = document.getElementById('chatMessages');

    // ✅ 참여자 수 내려온 경우 방 목록 갱신
    if (msg.participantCount !== undefined && msg.participantCount !== null) {
        updateRoomParticipantCount(msg.roomId, msg.participantCount);
    }

    if (msg.type === 'ENTER' || msg.type === 'LEAVE') {
        const div = document.createElement('div');
        div.className = 'system-message';
        div.textContent = msg.content;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return;
    }

    // 아래는 TALK 메시지 렌더링 기존 코드 그대로
    const row = document.createElement('div');
    row.className = 'message-row' + (isMe ? ' me' : '');
    const sender = document.createElement('div');
    sender.className = 'message-sender';
    sender.textContent = msg.sender;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = msg.content;

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(msg.createdAt);

    row.appendChild(sender);
    row.appendChild(bubble);
    row.appendChild(time);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
}

function setConnectionStatus(isConnected) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('connectionStatusText');

    if (isConnected) {
        dot.classList.remove('status-off');
        dot.classList.add('status-on');
        text.textContent = '연결됨';
    } else {
        dot.classList.remove('status-on');
        dot.classList.add('status-off');
        text.textContent = '미연결';
    }
}

function setActiveRoomItem(roomId) {
    const list = document.getElementById('roomList').children;
    for (const item of list) {
        if (roomId && item.dataset.roomId === String(roomId)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    }
}

// --- 방 목록 관련 ---

async function loadRooms() {
    try {
        const res = await fetch('/api/chat/rooms');
        if (!res.ok) {
            throw new Error('방 목록 조회 실패');
        }
        const rooms = await res.json();
        renderRoomList(rooms);
    } catch (e) {
        console.error(e);
        alert('채팅방 목록을 불러오지 못했습니다.');
    }
}

function renderRoomList(rooms) {
    const listEl = document.getElementById('roomList');
    listEl.innerHTML = '';

    if (!rooms || rooms.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'system-message';
        empty.textContent = '생성된 채팅방이 없습니다.';
        listEl.appendChild(empty);
        return;
    }

    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'room-item';
        div.dataset.roomId = room.id;

        // 왼쪽 정보 영역 (클릭 = 방 선택만)
        const info = document.createElement('div');
        info.className = 'room-item-info';

        const title = document.createElement('div');
        title.className = 'room-item-title';
        title.textContent = room.name;

        const sub = document.createElement('div');
        sub.className = 'room-item-sub';
        const count = room.participantCount ?? 0;
        sub.textContent = `ID: ${room.id} · 참여자 ${count}명`;

        info.appendChild(title);
        info.appendChild(sub);

        // 클릭하면 "선택 + 메시지 로딩"만, 입장은 X
        info.onclick = () => selectRoom(room.id, room.name);

        // 오른쪽 참여 버튼
        const joinBtn = document.createElement('button');
        joinBtn.className = 'room-join-btn';
        joinBtn.textContent = '참여';
        joinBtn.onclick = (e) => {
            e.stopPropagation(); // info 클릭 이벤트 막기
            joinRoom(room.id, room.name);
        };

        div.appendChild(info);
        div.appendChild(joinBtn);
        listEl.appendChild(div);
    });
}

function joinRoom(roomId, roomName) {
    if (!stompClient || !stompClient.connected) {
        alert('먼저 서버 연결을 해주세요.');
        return;
    }

    // 방 선택이 안 되어 있거나 다른 방이면, 먼저 선택
    if (currentRoomId !== roomId) {
        selectRoom(roomId, roomName);
    }

    // 실제 입장 처리 (구독 + ENTER 전송)
    enterRoom();
}

// --- 채팅방 생성 모달 ---

function openCreateRoomModal() {
    const modal = document.getElementById('createRoomModal');
    const input = document.getElementById('modalRoomName');
    input.value = '';
    modal.style.display = 'block';
    setTimeout(() => input.focus(), 50);
}

function closeCreateRoomModal() {
    const modal = document.getElementById('createRoomModal');
    modal.style.display = 'none';
}

async function confirmCreateRoom() {
    const input = document.getElementById('modalRoomName');
    const name = input.value.trim();
    if (!name) {
        alert('채팅방 이름을 입력해주세요.');
        return;
    }

    try {
        const res = await fetch('/api/chat/rooms?name=' + encodeURIComponent(name), {
            method: 'POST'
        });
        if (!res.ok) {
            throw new Error('방 생성 실패');
        }
        const room = await res.json();
        closeCreateRoomModal();
        await loadRooms();
        alert(`채팅방 "${room.name}"이(가) 생성되었습니다.`);
    } catch (e) {
        console.error(e);
        alert('채팅방 생성에 실패했습니다.');
    }
}

// --- 방 선택 및 입장 ---
// async function fetchParticipantCount(roomId) {
//     try {
//         const res = await fetch(`/api/chat/rooms/${roomId}/participants/count`);
//         if (!res.ok) return;
//         const data = await res.json(); // { count: 3 }
//         const label = document.getElementById('participantCountLabel');
//         label.textContent = `참여자 ${data.count}명`;
//     } catch (e) {
//         console.error(e);
//     }
// }

function selectRoom(roomId, roomName) {
    currentRoomId = roomId;
    currentRoomName = roomName;
    document.getElementById('roomTitle').textContent =
        `현재 채팅방: ${roomName} (ID: ${roomId})`;
    setActiveRoomItem(roomId);

    // ✅ 방만 선택. 입장 상태는 false로 초기화
    isJoinedCurrentRoom = false;

    // ✅ 이전 채팅 내용은 지움 (이전에 보던 방 내용 남지 않도록)
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    // ❌ 여기서 loadRecentMessages(roomId) 호출하지 않음
    // 메시지는 실제 입장 후(enterRoom 안)에서만 가져올 것
}

// --- WebSocket / STOMP 연결 ---

function connect() {
    if (stompClient && stompClient.connected) {
        alert('이미 서버에 연결되어 있습니다.');
        return;
    }

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {
        setConnectionStatus(true);

        if (currentRoomId) {
            enterRoom();
        }
    }, (error) => {
        console.error('STOMP error', error);
        setConnectionStatus(false);
        alert('서버 연결에 실패했습니다.');
    });
}

function enterRoom() {
    if (!currentRoomId) {
        alert('먼저 채팅방을 선택해주세요.');
        return;
    }
    if (!stompClient || !stompClient.connected) {
        alert('먼저 서버 연결을 해주세요.');
        return;
    }

    // 이전 방 구독 해제
    if (currentSubscription) {
        currentSubscription.unsubscribe();
        currentSubscription = null;
    }

    const roomTopic = `/topic/room${currentRoomId}`;
    const nickname = document.getElementById('nickname').value || '익명';

    // ✅ 방 구독
    currentSubscription = stompClient.subscribe(roomTopic, (frame) => {
        const body = JSON.parse(frame.body);
        const myName = document.getElementById('nickname').value || '익명';
        const isMe = body.sender === myName;
        appendMessage(body, isMe);
    });

    // ✅ 입장 상태 true
    isJoinedCurrentRoom = true;

    // ✅ 입장 이벤트 전송 (공지 + 참여자 수 갱신은 서버에서 처리)
    stompClient.send('/app/chat.enter', {}, JSON.stringify({
        roomId: currentRoomId,
        sender: nickname
    }));

    // ✅ 이때만 최근 메시지 불러오기
    loadRecentMessages(currentRoomId);
}

// --- 메시지 전송 ---

function sendMessage() {
    if (!currentRoomId) {
        alert('먼저 채팅방을 선택해주세요.');
        return;
    }
    if (!stompClient || !stompClient.connected) {
        alert('먼저 서버 연결을 해주세요.');
        return;
    }
    if (!isJoinedCurrentRoom) {
        alert('이 채팅방에 입장하지 않은 상태입니다. 먼저 [참여] 버튼을 눌러 입장해주세요.');
        return;
    }

    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;

    const nickname = document.getElementById('nickname').value || '익명';

    stompClient.send('/app/chat.send', {}, JSON.stringify({
        roomId: currentRoomId,
        sender: nickname,
        content: content,
        type: 'TALK'
    }));

    input.value = '';
}

// --- 최근 50개 메시지 로딩 함수 추가 ---
async function loadRecentMessages(roomId) {
    try {
        const res = await fetch(`/api/chat/rooms/${roomId}/messages?size=50`);
        if (!res.ok) {
            throw new Error('메시지 조회 실패');
        }
        const messages = await res.json();

        const container = document.getElementById('chatMessages');
        container.innerHTML = ''; // 선택하자마자 이전 내용 제거

        const myName = document.getElementById('nickname').value || '익명';

        // 서버에서 오래된 순으로 보내준다고 가정 (혹은 desc면 여기서 뒤집어도 됨)
        messages.forEach(msg => {
            const isMe = msg.sender === myName;
            appendMessage(msg, isMe);
        });
    } catch (e) {
        console.error(e);
        // 메시지 없다고 해서 꼭 alert 띄울 필요는 없음, 조용히 무시해도 됨
    }
}

// 퇴장 - leave 송신, 구독 해제, ui 초기화
function leaveRoom() {
    if (!currentRoomId) {
        alert('먼저 채팅방을 선택해주세요.');
        return;
    }

    const nickname = document.getElementById('nickname').value || '익명';
    const leavingRoomId = currentRoomId;

    if (stompClient && stompClient.connected) {
        stompClient.send('/app/chat.leave', {}, JSON.stringify({
            roomId: leavingRoomId,
            sender: nickname
        }));
    }

    // 로컬 참여자 수 -1 처리 (앞에서 설명한 함수가 있다면)
    changeRoomParticipantCount(leavingRoomId, -1);

    // ✅ 구독 해제
    if (currentSubscription) {
        currentSubscription.unsubscribe();
        currentSubscription = null;
    }

    // ✅ 입장 상태 false
    isJoinedCurrentRoom = false;

    // UI 초기화
    currentRoomId = null;
    currentRoomName = '';
    document.getElementById('roomTitle').textContent = '채팅방을 선택해주세요';
    document.getElementById('chatMessages').innerHTML = '';
    setActiveRoomItem(null);
}

// --- 초기 로딩 ---

window.addEventListener('load', () => {
    loadRooms();
});

// 모달 밖 클릭 시 닫기 (UX용)
window.addEventListener('click', (event) => {
    const modal = document.getElementById('createRoomModal');
    if (event.target === modal) {
        closeCreateRoomModal();
    }
});