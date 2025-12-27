import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";

// 採点確定・結果表示へ
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId, adjustments } = await request.json(); 
    // adjustments: { [playerId]: scoreDelta } 
    // 基本的には一致判定の結果に基づいてクライアント側で計算されたスコア、
    // またはホストが手動で調整したスコアの増減を受け取る

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
        { error: "ホストのみが採点を確定できます" },
        { status: 403 }
      );
    }

    if (room.phase !== "scoring") {
      return NextResponse.json(
        { error: "採点フェーズではありません" },
        { status: 400 }
      );
    }

    // スコア更新
    const updatedPlayers = room.players.map(p => {
      const adjustment = adjustments[p.id] || 0;
      return {
        ...p,
        score: p.score + adjustment
      };
    });

    const updatedRoom = await updateRoom(code, {
      players: updatedPlayers,
      phase: "results",
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error finalizing scores:", error);
    return NextResponse.json(
      { error: "スコアの確定に失敗しました" },
      { status: 500 }
    );
  }
}
