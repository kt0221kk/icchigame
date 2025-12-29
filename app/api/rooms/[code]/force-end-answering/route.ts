import { NextResponse } from "next/server";
import { updateRoom, getRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { playerId } = await request.json();
    const { code } = await params;

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // ホスト権限チェック
    if (room.hostId !== playerId) {
      return NextResponse.json(
        { error: "Only host can force end answering" },
        { status: 403 }
      );
    }
    
    // 現在のフェーズチェック
    if (room.phase !== "answering") {
        return NextResponse.json(
            { error: "Invalid phase" },
            { status: 400 }
        );
    }

    // 全プレイヤーを強制的に提出済みにする
    // 回答がないプレイヤーは currentAnswer が undefined のまま hasSubmitted になる
    const updatedPlayers = room.players.map(p => ({
        ...p,
        hasSubmitted: true
    }));

    // フェーズをscoringへ移行
    const updatedRoom = await updateRoom(code, {
      players: updatedPlayers,
      phase: "scoring",
      scoringGroups: [] // グループ分け初期化
    });

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error) {
    console.error("Force end answering error:", error);
    return NextResponse.json(
      { error: "Failed to force end answering" },
      { status: 500 }
    );
  }
}
