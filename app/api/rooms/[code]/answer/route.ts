import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";

// 回答提出
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId, answer } = await request.json();

    const room = getRoom(code);
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

    let newPhase = room.phase;

    if (allAnswered) {
      // スコア計算
      const answerMap = new Map<string, string[]>();

      updatedPlayers.forEach(p => {
        if (p.answer) {
          const normalized = p.answer.toLowerCase().trim();
          if (!answerMap.has(normalized)) {
            answerMap.set(normalized, []);
          }
          answerMap.get(normalized)!.push(p.name);
        }
      });

      // 一致した回答にスコア加算
      updatedPlayers.forEach(p => {
        if (p.answer) {
          const normalized = p.answer.toLowerCase().trim();
          const matchCount = answerMap.get(normalized)?.length || 0;
          if (matchCount >= 2) {
            // 一致人数に応じてスコア加算
            p.score += matchCount;
          }
        }
      });

      // 結果表示フェーズへ移行
      newPhase = "results";
    }

    const updatedRoom = updateRoom(code, {
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
