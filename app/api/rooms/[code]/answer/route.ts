import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";
import { GamePhase } from "@/types/game";

// 回答提出
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId, answer } = await request.json();

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つかりません" },
        { status: 404 }
      );
    }

    if (room.phase !== "answering") {
      return NextResponse.json(
        { error: "回答フェーズではありません" },
        { status: 400 }
      );
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return NextResponse.json(
        { error: "プレイヤーが見つかりません" },
        { status: 404 }
      );
    }

    if (!answer || !answer.trim()) {
      return NextResponse.json(
        { error: "回答を入力してください" },
        { status: 400 }
      );
    }

    // 回答を記録
    const updatedPlayers = room.players.map(p =>
      p.id === playerId
        ? { ...p, answer: answer.trim(), hasSubmitted: true }
        : p
    );

    // 全員が回答したか確認
    const allAnswered = updatedPlayers.every(p => p.hasSubmitted);

    let newPhase: GamePhase = room.phase;

    if (allAnswered) {
      // 採点フェーズへ移行（スコア計算はまだしない）
      newPhase = "scoring";
    }

    const updatedRoom = await updateRoom(code, {
      players: updatedPlayers,
      phase: newPhase,
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "回答の提出に失敗しました" },
      { status: 500 }
    );
  }
}
