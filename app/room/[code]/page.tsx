"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Room } from "@/types/game";
import WaitingRoom from "@/components/WaitingRoom";
import ProposingPhase from "@/components/ProposingPhase";
import VotingPhase from "@/components/VotingPhase";
import AnsweringPhase from "@/components/AnsweringPhase";
import ResultsPhase from "@/components/ResultsPhase";

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomCode = params.code as string;
  const playerName = searchParams.get("name");

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ルーム参加
  useEffect(() => {
    const joinRoom = async () => {
      if (!playerName) {
        router.push("/");
        return;
      }

      try {
        // まずルーム情報を取得
        const roomRes = await fetch(`/api/rooms/${roomCode}`);
        if (!roomRes.ok) {
          throw new Error("ルームが見つかりません");
        }

        const roomData = await roomRes.json();
        const existingPlayer = roomData.room.players.find(
          (p: { name: string }) => p.name === playerName
        );

        if (existingPlayer) {
          // 既に参加している場合
          setPlayerId(existingPlayer.id);
          setRoom(roomData.room);
        } else {
          // 新規参加
          const joinRes = await fetch(`/api/rooms/${roomCode}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerName }),
          });

          if (!joinRes.ok) {
            const errData = await joinRes.json();
            throw new Error(errData.error || "参加に失敗しました");
          }

          const joinData = await joinRes.json();
          setPlayerId(joinData.playerId);
          setRoom(joinData.room);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    joinRoom();
  }, [roomCode, playerName, router]);

  // ポーリングでルーム情報を更新
  useEffect(() => {
    if (!playerId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoom(data.room);
        }
      } catch (err) {
        console.error("Failed to poll room:", err);
      }
    }, 1000); // 1秒ごとにポーリング

    return () => clearInterval(interval);
  }, [roomCode, playerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="text-white text-2xl">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">エラー</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  if (!room || !playerId) {
    return null;
  }

  const currentPlayer = room.players.find(p => p.id === playerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-t-2xl shadow-lg p-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">一致ゲーム</h1>
              <p className="text-sm text-gray-600">
                ルームコード: <span className="font-mono font-bold text-purple-600">{room.code}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">ラウンド {room.currentRound}</p>
              <p className="text-lg font-bold text-gray-800">{currentPlayer?.name}</p>
              <p className="text-sm text-purple-600">スコア: {currentPlayer?.score}</p>
            </div>
          </div>
        </div>

        {/* フェーズ別コンテンツ */}
        <div className="bg-white rounded-b-2xl shadow-lg p-6 mb-4">
          {room.phase === "waiting" && (
            <WaitingRoom room={room} playerId={playerId} />
          )}
          {room.phase === "proposing" && (
            <ProposingPhase room={room} playerId={playerId} />
          )}
          {room.phase === "voting" && (
            <VotingPhase room={room} playerId={playerId} />
          )}
          {room.phase === "answering" && (
            <AnsweringPhase room={room} playerId={playerId} />
          )}
          {room.phase === "results" && (
            <ResultsPhase room={room} playerId={playerId} />
          )}
        </div>
      </div>
    </div>
  );
}
