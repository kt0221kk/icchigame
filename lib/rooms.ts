import { Room, Player } from "@/types/game";
import { kv } from "@vercel/kv";
import Redis from "ioredis";

// 開発環境でのホットリロード対策として globalThis を使用
const globalForRooms = global as unknown as { 
  rooms: Map<string, Room>,
  redisClient?: Redis
};

if (!globalForRooms.rooms) {
  globalForRooms.rooms = new Map<string, Room>();
}
const localRooms = globalForRooms.rooms;

// ストレージタイプの判定
// 1. REDIS_URLがある -> ioredis (標準Vercel Redis)
// 2. KV_REST_API_URLがある -> @vercel/kv (Vercel KV)
// 3. どちらもない -> インメモリ (開発用)
const USE_IOREDIS = !!process.env.REDIS_URL;
const USE_VERCEL_KV = !USE_IOREDIS && !!process.env.KV_REST_API_URL;
const USE_KV = USE_IOREDIS || USE_VERCEL_KV;

// Redisクライアントの初期化 (ioredis用)
let redis: Redis | null = null;
if (USE_IOREDIS) {
  if (!globalForRooms.redisClient) {
    globalForRooms.redisClient = new Redis(process.env.REDIS_URL!);
  }
  redis = globalForRooms.redisClient;
}

// 短期間のインメモリキャッシュ（Vercel KV/Redisへの負荷軽減用）
const roomCache = new Map<string, { data: Room | undefined; timestamp: number }>();
const CACHE_TTL = 1000; // 1秒間キャッシュする

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

// 共通: DB保存ヘルパー
async function saveToDB(code: string, room: Room) {
  const key = `room:${code}`;
  // 24時間保持 (86400秒)
  if (USE_IOREDIS && redis) {
    await redis.set(key, JSON.stringify(room), "EX", 86400);
  } else if (USE_VERCEL_KV) {
    await kv.set(key, room, { ex: 86400 });
  } else {
    localRooms.set(code, room);
  }

  // キャッシュも更新
  roomCache.set(code, { 
    data: room, 
    timestamp: Date.now() 
  });
}

// 共通: DB取得ヘルパー
async function getFromDB(code: string): Promise<Room | null> {
  const key = `room:${code}`;
  
  // キャッシュチェック
  const cached = roomCache.get(code);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data || null;
  }

  let room: Room | null = null;

  if (USE_IOREDIS && redis) {
    const data = await redis.get(key);
    if (data) {
      room = JSON.parse(data) as Room;
    }
  } else if (USE_VERCEL_KV) {
    room = await kv.get<Room>(key);
  } else {
    room = localRooms.get(code) || null;
  }

  // キャッシュ更新
  roomCache.set(code, { 
    data: room || undefined, 
    timestamp: Date.now() 
  });

  return room;
}

// 共通: DB削除ヘルパー
async function deleteFromDB(code: string): Promise<boolean> {
  const key = `room:${code}`;
  if (USE_IOREDIS && redis) {
    const res = await redis.del(key);
    return res > 0;
  } else if (USE_VERCEL_KV) {
    const res = await kv.del(key);
    return res > 0;
  } else {
    return localRooms.delete(code);
  }
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

  await saveToDB(code, room);
  return room;
}

// ルーム取得
export async function getRoom(code: string): Promise<Room | undefined> {
  const normalizedCode = code.toUpperCase().trim();
  const room = await getFromDB(normalizedCode);
  return room || undefined;
}

// ルーム一覧（デバッグ用）
export async function getAllRooms(): Promise<Room[]> {
  // 実装簡略化のため空配列を返す（本番運用で全列挙は危険なため）
  if (USE_KV) return [];
  return Array.from(localRooms.values());
}

// ルーム削除
export async function deleteRoom(code: string): Promise<boolean> {
  const normalizedCode = code.toUpperCase().trim();
  return deleteFromDB(normalizedCode);
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

  await saveToDB(code, updatedRoom);

  // Pusher通知
  try {
      const { pusherServer } = await import("@/lib/pusher");
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET) {
        await pusherServer.trigger(`room-${code}`, "update", updatedRoom);
      }
  } catch (err) {
      console.error("Pusher trigger error:", err);
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

  await saveToDB(code, updatedRoom);
  
  // Pusher通知も行うべきだが、updateRoom経由ではないためここでも呼ぶか、
  // あるいは updateRoom を使って実装しなおすのが綺麗。
  // 今回は単純に通知処理を入れる。
  try {
      const { pusherServer } = await import("@/lib/pusher");
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET) {
        await pusherServer.trigger(`room-${code}`, "update", updatedRoom);
      }
  } catch (err) {
      console.error("Pusher trigger error:", err);
  }

  return { room: updatedRoom, playerId };
}

// 古いルームのクリーンアップ（1時間以上古いもの）
export function cleanupOldRooms(): number {
  if (USE_KV) return 0; // KV/RedisはTTLで管理

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
  if (!(global as any).cleanupInterval) {
    (global as any).cleanupInterval = setInterval(() => {
      const deleted = cleanupOldRooms();
      if (deleted > 0) {
        console.log(`Cleaned up ${deleted} old rooms`);
      }
    }, 5 * 60 * 1000);
  }
}
