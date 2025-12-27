import { NextResponse } from "next/server";
import { createRoom } from "@/lib/rooms";

// ルーム作成
export async function POST(request: Request) {
  try {
    const { hostName } = await request.json();

    if (!hostName || !hostName.trim()) {
      return NextResponse.json(
        { error: "ホスト名が必要です" },
        { status: 400 }
      );
    }

    const room = createRoom(hostName.trim());

    return NextResponse.json({
      roomCode: room.code,
      playerId: room.hostId,
      room,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "ルームの作成に失敗しました" },
      { status: 500 }
    );
  }
}
