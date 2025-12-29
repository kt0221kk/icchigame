import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";
import { GamePhase } from "@/types/game";

// お題提案
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId, topic, skip } = await request.json();

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つかりません" },
        { status: 404 }
      );
    }

    if (room.phase !== "proposing") {
      return NextResponse.json(
        { error: "お題提案フェーズではありません" },
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

    if (!skip && (!topic || !topic.trim())) {
      return NextResponse.json(
        { error: "お題を入力してください" },
        { status: 400 }
      );
    }

    // プレイヤーのお題を更新
    const updatedPlayers = room.players.map(p =>
      p.id === playerId
        ? { 
            ...p, 
            proposedTopic: skip ? undefined : topic.trim(), 
            hasSubmitted: true 
          }
        : p
    );

    // 全員が提案したか確認
    const allProposed = updatedPlayers.every(p => p.hasSubmitted);

    let newPhase: GamePhase = room.phase;
    let topicProposals = room.topicProposals;

    if (allProposed) {
      // 投票フェーズへ移行
      newPhase = "voting";
      topicProposals = updatedPlayers
        .filter(p => p.proposedTopic)
        .map(p => ({
          id: p.id,
          playerId: p.id,
          playerName: p.name,
          topic: p.proposedTopic!,
          votes: 0,
        }));

      // もしお題が0個ならランダムお題を追加
      if (topicProposals.length === 0) {
          const { getRandomTopics } = await import("@/lib/topics");
          const randomTopics = getRandomTopics(4);
          topicProposals = randomTopics.map((topic, index) => ({
              id: `system-${Date.now()}-${index}`,
              playerId: "system",
              playerName: "お助けボット",
              topic: topic,
              votes: 0
          }));
      }

      // hasSubmittedをリセット
      updatedPlayers.forEach(p => { p.hasSubmitted = false; });
    }

    const updatedRoom = await updateRoom(code, {
      players: updatedPlayers,
      phase: newPhase,
      topicProposals,
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error proposing topic:", error);
    return NextResponse.json(
      { error: "お題の提案に失敗しました" },
      { status: 500 }
    );
  }
}
