"use client";

import { Room, AnswerResult } from "@/types/game";
import { useMemo, useState } from "react";

interface Props {
  room: Room;
  playerId: string;
}

export default function ResultsPhase({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const [starting, setStarting] = useState(false);

  // 回答を集計
  const results = useMemo(() => {
    const answerMap = new Map<string, string[]>();

    room.players.forEach(player => {
      if (player.answer) {
        const normalized = player.answer.toLowerCase().trim();
        if (!answerMap.has(normalized)) {
          answerMap.set(normalized, []);
        }
        answerMap.get(normalized)!.push(player.name);
      }
    });

    const results: AnswerResult[] = Array.from(answerMap.entries()).map(([answer, players]) => {
      // 元の回答を取得（最初のプレイヤーの回答を使用）
      const originalAnswer = room.players.find(p =>
        p.answer?.toLowerCase().trim() === answer
      )?.answer || answer;

      return {
        answer: originalAnswer,
        players,
        count: players.length,
        isMatch: players.length >= 2,
      };
    });

    return results.sort((a, b) => b.count - a.count);
  }, [room.players]);

  const matchedResults = results.filter(r => r.isMatch);
  const unmatchedResults = results.filter(r => !r.isMatch);

  const nextRound = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/next-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "次のラウンドの開始に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("次のラウンドの開始に失敗しました");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">結果発表</h2>
        <div className="inline-block bg-purple-100 border-2 border-purple-500 rounded-xl px-6 py-3 mt-2">
          <p className="text-sm text-purple-700 mb-1">お題</p>
          <p className="text-2xl font-bold text-purple-900">{room.selectedTopic}</p>
        </div>
      </div>

      {/* 一致した回答 */}
      {matchedResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-green-700 flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            一致した回答
          </h3>
          {matchedResults.map((result, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{result.answer}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {result.count}人が一致！
                  </div>
                </div>
                <div className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg">
                  +{result.count}pt
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.players.map((playerName, i) => (
                  <span
                    key={i}
                    className="bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {playerName}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 一致しなかった回答 */}
      {unmatchedResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-700">一致しなかった回答</h3>
          <div className="grid grid-cols-2 gap-3">
            {unmatchedResults.map((result, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3"
              >
                <div className="text-lg font-semibold text-gray-800">{result.answer}</div>
                <div className="text-sm text-gray-500 mt-1">{result.players[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* スコアボード */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4">
        <h3 className="text-xl font-bold text-purple-900 mb-4 text-center">
          現在のスコア
        </h3>
        <div className="space-y-2">
          {[...room.players]
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div
                key={player.id}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  player.id === playerId
                    ? "bg-purple-200 border-2 border-purple-500"
                    : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-400">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-bold text-gray-800">{player.name}</div>
                    {player.isHost && (
                      <span className="text-xs text-yellow-700">ホスト</span>
                    )}
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {player.score}pt
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 次のラウンドボタン */}
      {isHost ? (
        <button
          onClick={nextRound}
          disabled={starting}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition duration-200"
        >
          {starting ? "開始中..." : "次のラウンドへ"}
        </button>
      ) : (
        <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            ホストが次のラウンドを開始するまで待機してください
          </p>
        </div>
      )}
    </div>
  );
}
