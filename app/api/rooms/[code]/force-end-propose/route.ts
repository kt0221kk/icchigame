import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";
import { GamePhase } from "@/types/game";

// お題提案フェーズを強制終了して投票へ移行
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
        { error: "ホストのみがこの操作を行えます" },
        { status: 403 }
      );
    }

    if (room.phase !== "proposing") {
      return NextResponse.json(
        { error: "お題提案フェーズではありません" },
        { status: 400 }
      );
    }

    // 提案がない状態での終了は許可しない（あるいはデフォルトお題を入れる？）
    // ここでは少なくとも1つ提案があればOKとする、あるいは0個でも進める場合は別途処理が必要
    // 今回は「提案済みのお題だけで投票に行く」とする
    
    // スキップ扱いで全員提出済みとする
    const updatedPlayers = room.players.map(p => 
      p.hasSubmitted ? p : { ...p, hasSubmitted: true, proposedTopic: undefined }
    );

    let newPhase: GamePhase = "voting";
    let topicProposals = updatedPlayers
      .filter(p => p.proposedTopic)
      .map(p => ({
        id: p.id,
        playerId: p.id,
        playerName: p.name,
        topic: p.proposedTopic!,
        votes: 0,
      }));

    if (topicProposals.length === 0) {
        return NextResponse.json(
            { error: "有効なお題が一つもありません" },
            { status: 400 }
        );
    }

    // hasSubmittedをリセット（次のフェーズのため）
    updatedPlayers.forEach(p => { p.hasSubmitted = false; });

    const updatedRoom = await updateRoom(code, {
      players: updatedPlayers,
      phase: newPhase,
      topicProposals,
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error ending proposal phase:", error);
    return NextResponse.json(
      { error: "フェーズの終了に失敗しました" },
      { status: 500 }
    );
  }
}
