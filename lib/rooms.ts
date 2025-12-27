import { Room, Player } from "@/types/game";

// メモリ上のルームストレージ
const rooms = new Map<string, Room>();

// ルームコード生成
export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// プレイヤーID生成
export function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// ルーム作成
export function createRoom(hostName: string): Room {
  const code = generateRoomCode();
  const hostId = generatePlayerId();

  const host: Player = {
    id: hostId,
    name: hostName,
    isHost: true,
    score: 0,
    hasSubmitted: false,
  };

  const room: Room = {
    code,
    hostId,
    players: [host],
    phase: "waiting",
    currentRound: 0,
    topicProposals: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

// ルーム取得
export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

// ルーム一覧（デバッグ用）
export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

// ルーム削除
export function deleteRoom(code: string): boolean {
  return rooms.delete(code);
}

// ルーム更新
export function updateRoom(code: string, updates: Partial<Room>): Room | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;

  const updatedRoom = {
    ...room,
    ...updates,
    updatedAt: Date.now(),
  };

  rooms.set(code, updatedRoom);
  return updatedRoom;
}

// プレイヤー追加
export function addPlayer(code: string, playerName: string): { room: Room; playerId: string } | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;

  // 同名チェック
  if (room.players.some(p => p.name === playerName)) {
    throw new Error("同じ名前のプレイヤーが既に存在します");
  }

  const playerId = generatePlayerId();
  const player: Player = {
    id: playerId,
    name: playerName,
    isHost: false,
    score: 0,
    hasSubmitted: false,
  };

  const updatedRoom = {
    ...room,
    players: [...room.players, player],
    updatedAt: Date.now(),
  };

  rooms.set(code, updatedRoom);
  return { room: updatedRoom, playerId };
}

// 古いルームのクリーンアップ（1時間以上古いもの）
export function cleanupOldRooms(): number {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1時間
  let deletedCount = 0;

  for (const [code, room] of rooms.entries()) {
    if (now - room.updatedAt > maxAge) {
      rooms.delete(code);
      deletedCount++;
    }
  }

  return deletedCount;
}

// 定期的なクリーンアップ（5分ごと）
setInterval(() => {
  const deleted = cleanupOldRooms();
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} old rooms`);
  }
}, 5 * 60 * 1000);
