import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";

// 次のラウンドへ
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId } = await request.json();

    const room = getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つかりません" },
        { status: 404 }
      );
    }

    // ホストチェック
    if (room.hostId !== playerId) {
      return NextResponse.json(
        { error: "ホストのみが次のラウンドを開始できます" },
        { status: 403 }
      );
    }

    if (room.phase !== "results") {
      return NextResponse.json(
        { error: "結果表示フェーズではありません" },
        { status: 400 }
      );
    }

    // プレイヤーの状態をリセット
    const resetPlayers = room.players.map(p => ({
      ...p,
      hasSubmitted: false,
      proposedTopic: undefined,
      votedTopicId: undefined,
      answer: undefined,
    }));

    const updatedRoom = updateRoom(code, {
      phase: "proposing",
      currentRound: room.currentRound + 1,
      topicProposals: [],
      selectedTopic: undefined,
      players: resetPlayers,
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error starting next round:", error);
    return NextResponse.json(
      { error: "次のラウンドの開始に失敗しました" },
      { status: 500 }
    );
  }
}
