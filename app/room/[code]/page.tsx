"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Room } from "@/types/game";
import WaitingRoom from "@/components/WaitingRoom";
import ProposingPhase from "@/components/ProposingPhase";
import VotingPhase from "@/components/VotingPhase";
import AnsweringPhase from "@/components/AnsweringPhase";
import ResultsPhase from "@/components/ResultsPhase";
import TopicSelectionPhase from "@/components/TopicSelectionPhase";
import ScoringPhase from "@/components/ScoringPhase";

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomCode = params.code as string;
  const playerName = searchParams.get("name");
  const urlPlayerId = searchParams.get("playerId");

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(urlPlayerId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 参加処理重複防止用Ref
  const joiningRef = useRef(false);

  // ルーム情報取得関数
  const fetchRoomData = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("ルームが見つからない");
        }
        throw new Error("ルーム情報の取得に失敗しました");
      }
      const data = await res.json();
      setRoom(data.room);
      return data.room;
    } catch (err) {
      if (err instanceof Error && err.message !== "ルームが見つからない") {
        console.error("Failed to fetch room:", err);
      }
      return null;
    }
  };

  // 初期化と参加処理
  useEffect(() => {
    const initRoom = async () => {
      if (!playerName) {
        router.push("/");
        return;
      }

      // 既に処理中ならスキップ
      if (joiningRef.current) return;
      joiningRef.current = true;

      try {
        // 1. URLにplayerIdがある場合（作成直後）
        if (urlPlayerId) {
          // ルーム情報を取得してみる
          const roomData = await fetchRoomData();
          if (!roomData) {
            // ルームが見つからない場合はエラーにする
            throw new Error("ルームが見つかりません");
          }
          setLoading(false);
          return;
        }

        // 2. 通常の参加フロー
        // まずルーム情報を取得
        const roomData = await fetchRoomData();
        
        if (!roomData) {
          throw new Error("ルームが見つかりません");
        }

        const existingPlayer = roomData.players.find(
          (p: { name: string }) => p.name === playerName
        );

        if (existingPlayer) {
          // 既に参加している場合
          setPlayerId(existingPlayer.id);
        } else {
          // 新規参加
          const joinRes = await fetch(`/api/rooms/${roomCode}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerName }),
          });

          if (!joinRes.ok) {
            const errData = await joinRes.json();
            
            // リカバリ: 重複エラーなら、タイミングの問題で既に参加できている可能性があるので再確認
            if (joinRes.status === 400 || errData.error === "同じ名前のプレイヤーが既に存在します") {
              const retryRoom = await fetchRoomData();
              const retryPlayer = retryRoom?.players.find((p: any) => p.name === playerName);
              if (retryPlayer) {
                setPlayerId(retryPlayer.id);
                setRoom(retryRoom);
                return;
              }
            }
            
            throw new Error(errData.error || "参加に失敗しました");
          }

          const joinData = await joinRes.json();
          setPlayerId(joinData.playerId);
          setRoom(joinData.room);
        }
      } catch (err) {
        // エラーハンドリング
        if (err instanceof Error && err.message !== "ルームが見つからない") {
          console.error(err);
        }
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
        joiningRef.current = false;
      }
    };

    initRoom();
  }, [roomCode, playerName, router, urlPlayerId]);

  // ポーリング
  useEffect(() => {
    if (!playerId) return;

    // 初回実行は initRoom で行われるため、インターバルのみ設定
    const interval = setInterval(async () => {
      await fetchRoomData();
    }, 5000);

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
    // データ読み込み待ち、またはエラー発生前の状態
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="text-white text-2xl">データを取得中...</div>
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
          {room.phase === "topic_selection" && (
            <TopicSelectionPhase room={room} playerId={playerId} />
          )}
          {room.phase === "answering" && (
            <AnsweringPhase room={room} playerId={playerId} />
          )}
          {room.phase === "scoring" && (
            <ScoringPhase room={room} playerId={playerId} />
          )}
          {room.phase === "results" && (
            <ResultsPhase room={room} playerId={playerId} />
          )}
        </div>
      </div>
    </div>
  );
}
