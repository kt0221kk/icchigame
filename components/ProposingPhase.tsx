"use client";

import { Room } from "@/types/game";
import { useState } from "react";

interface Props {
  room: Room;
  playerId: string;
}

export default function ProposingPhase({ room, playerId }: Props) {
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;
  const hasProposed = currentPlayer?.hasSubmitted || false;
  const proposedCount = room.players.filter(p => p.hasSubmitted).length;

  const submitTopic = async (skip = false) => {
    if (!skip && !topic.trim()) {
      alert("お題を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, topic: skip ? "" : topic.trim(), skip }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "お題の提案に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("お題の提案に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const forceEndPhase = async () => {
    if (!confirm("お題の提案を締め切って投票に移りますか？\n（未提出のプレイヤーはスキップ扱いになります）")) {
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${room.code}/force-end-propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "操作に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">お題提案</h2>
        <p className="text-gray-600">
          みんなで遊びたいお題を提案してください
        </p>
        <div className="mt-2 text-sm text-gray-500">
          {proposedCount} / {room.players.length} 人が提案済み
        </div>
      </div>

      {hasProposed ? (
        <div className="bg-green-50 border border-green-300 rounded-lg p-6 text-center">
          <div className="text-green-600 text-5xl mb-3">✓</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">提案完了！</h3>
          <p className="text-green-800">
            {currentPlayer?.proposedTopic ? (
               <>あなたの提案: <span className="font-bold">{currentPlayer.proposedTopic}</span></>
            ) : (
               "スキップしました"
            )}
          </p>
          <p className="text-green-700 mt-2">他のプレイヤーが提案するまで待機してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              お題を入力
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: 赤いもの、甘い食べ物、有名な動物"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
              maxLength={50}
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              {topic.length} / 50 文字
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button
              onClick={() => submitTopic(true)}
              disabled={submitting}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition duration-200"
            >
              {submitting ? "..." : "スキップ"}
            </button>
            <button
              onClick={() => submitTopic(false)}
              disabled={submitting || !topic.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition duration-200"
            >
              {submitting ? "提案中..." : "お題を提案"}
            </button>
          </div>
        </div>
      )}

      {/* 進行状況 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">進行状況</span>
          <span className="text-sm text-gray-600">
            {proposedCount} / {room.players.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(proposedCount / room.players.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* プレイヤー状態 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">プレイヤー状態</h3>
        <div className="grid grid-cols-2 gap-2">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`p-2 rounded-lg text-sm ${
                player.hasSubmitted
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span className="font-medium">{player.name}</span>
              {player.hasSubmitted && <span className="ml-1">✓</span>}
            </div>
          ))}
        </div>
      </div>

       {isHost && proposedCount < room.players.length && proposedCount > 0 && (
        <div className="pt-4 border-t border-gray-200">
           <p className="text-sm text-gray-500 mb-2 text-center">ホストメニュー</p>
           <button
            onClick={forceEndPhase}
            className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-bold py-3 px-4 rounded-lg transition duration-200 border border-red-300"
           >
             提案を締め切って投票へ進む
           </button>
        </div>
      )}
    </div>
  );
}
