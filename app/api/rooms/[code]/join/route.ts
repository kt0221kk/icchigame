import { NextResponse } from "next/server";
import { addPlayer, getRoom } from "@/lib/rooms";

// ルーム参加
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerName } = await request.json();

    if (!playerName || !playerName.trim()) {
      return NextResponse.json(
        { error: "プレイヤー名が必要です" },
        { status: 400 }
      );
    }

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つかりません" },
        { status: 404 }
      );
    }

    if (room.phase !== "waiting") {
      return NextResponse.json(
        { error: "ゲームが既に開始されています" },
        { status: 400 }
      );
    }

    const result = await addPlayer(code, playerName.trim());

    if (!result) {
      return NextResponse.json(
        { error: "プレイヤーの追加に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      playerId: result.playerId,
      room: result.room,
    });
  } catch (error: unknown) {
    console.error("Error joining room:", error);
    const errorMessage = error instanceof Error ? error.message : "プレイヤーの追加に失敗しました";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
