import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";

// ゲーム開始（お題提案フェーズへ）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId } = await request.json();

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つかりません" },
        { status: 404 }
      );
    }

    // ホストチェック
    if (room.hostId !== playerId) {
      return NextResponse.json(
        { error: "ホストのみがゲームを開始できます" },
        { status: 403 }
      );
    }

    if (room.players.length < 2) {
      return NextResponse.json(
        { error: "最低2人のプレイヤーが必要です" },
        { status: 400 }
      );
    }

    // お題提案フェーズに移行
    const updatedRoom = await updateRoom(code, {
      phase: "proposing",
      currentRound: room.currentRound + 1,
      topicProposals: [],
      players: room.players.map(p => ({ ...p, hasSubmitted: false, proposedTopic: undefined })),
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json(
      { error: "ゲームの開始に失敗しました" },
      { status: 500 }
    );
  }
}
