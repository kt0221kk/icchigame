import { Room, Player } from "@/types/game";
import { kv } from "@vercel/kv";

// 開発環境でのホットリロード対策として globalThis を使用
const globalForRooms = global as unknown as { rooms: Map<string, Room> };
if (!globalForRooms.rooms) {
  globalForRooms.rooms = new Map<string, Room>();
}
const localRooms = globalForRooms.rooms;

// Vercel KVが利用可能かどうか判定
const USE_KV = !!process.env.KV_REST_API_URL;

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
export async function createRoom(hostName: string): Promise<Room> {
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

  if (USE_KV) {
    await kv.set(`room:${code}`, room, { ex: 3600 }); // 1時間で期限切れ
  } else {
    localRooms.set(code, room);
  }
  
  return room;
}

// ルーム取得
export async function getRoom(code: string): Promise<Room | undefined> {
  if (USE_KV) {
    const room = await kv.get<Room>(`room:${code}`);
    return room || undefined;
  } else {
    return localRooms.get(code);
  }
}

// ルーム一覧（デバッグ用）
export async function getAllRooms(): Promise<Room[]> {
  if (USE_KV) {
    // KVではkeysコマンドは重いがデバッグ用なので許容
    const keys = await kv.keys("room:*");
    if (keys.length === 0) return [];
    
    // パイプラインで取得したいが、型定義の都合上個別に取得するかmgetを使う
    // mgetはキーのリストを取る
    if (keys.length > 0) {
        // mgetは(key1, key2, ...)の形式
        const rooms = await kv.mget<Room[]>(...keys);
        return rooms.filter((r): r is Room => !!r);
    }
    return [];
  } else {
    return Array.from(localRooms.values());
  }
}

// ルーム削除
export async function deleteRoom(code: string): Promise<boolean> {
  if (USE_KV) {
    const result = await kv.del(`room:${code}`);
    return result > 0;
  } else {
    return localRooms.delete(code);
  }
}

// ルーム更新
export async function updateRoom(code: string, updates: Partial<Room>): Promise<Room | undefined> {
  const room = await getRoom(code);
  if (!room) return undefined;

  const updatedRoom = {
    ...room,
    ...updates,
    updatedAt: Date.now(),
  };

  if (USE_KV) {
    await kv.set(`room:${code}`, updatedRoom, { ex: 3600 });
  } else {
    localRooms.set(code, updatedRoom);
  }
  
  return updatedRoom;
}

// プレイヤー追加
export async function addPlayer(code: string, playerName: string): Promise<{ room: Room; playerId: string } | undefined> {
  const room = await getRoom(code);
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

  if (USE_KV) {
    await kv.set(`room:${code}`, updatedRoom, { ex: 3600 });
  } else {
    localRooms.set(code, updatedRoom);
  }
  
  return { room: updatedRoom, playerId };
}

// 古いルームのクリーンアップ（1時間以上古いもの）
// KVの場合は自動削除されるので、主にローカル用
export function cleanupOldRooms(): number {
  if (USE_KV) return 0; // KVはTTLで管理

  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1時間
  let deletedCount = 0;

  for (const [code, room] of localRooms.entries()) {
    if (now - room.updatedAt > maxAge) {
      localRooms.delete(code);
      deletedCount++;
    }
  }

  return deletedCount;
}

// 定期的なクリーンアップ（5分ごと）
if (!USE_KV) {
  // 開発環境でHMRが走るたびにsetIntervalが増えるのを防ぐ
  if (!(global as any).cleanupInterval) {
    (global as any).cleanupInterval = setInterval(() => {
      const deleted = cleanupOldRooms();
      if (deleted > 0) {
        console.log(`Cleaned up ${deleted} old rooms`);
      }
    }, 5 * 60 * 1000);
  }
}
