"use client";

import { Room, Player } from "@/types/game";
import { useState, useMemo } from "react";

interface Props {
  room: Room;
  playerId: string;
}

export default function ScoringPhase({ room, playerId }: Props) {
  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;
  const [submitting, setSubmitting] = useState(false);

  // 回答の初期グルーピング（完全一致で自動判定）
  // グループID (0, 1, 2...) -> プレイヤーIDの配列
  const [groups, setGroups] = useState<Map<number, string[]>>(() => {
    const initialGroups = new Map<number, string[]>();
    const answerToGroupId = new Map<string, number>();
    let nextId = 0;

    room.players.forEach(p => {
      if (!p.answer) return;
      const normalized = p.answer.toLowerCase().trim();
      
      if (answerToGroupId.has(normalized)) {
        const groupId = answerToGroupId.get(normalized)!;
        initialGroups.get(groupId)!.push(p.id);
      } else {
        answerToGroupId.set(normalized, nextId);
        initialGroups.set(nextId, [p.id]);
        nextId++;
      }
    });
    return initialGroups;
  });

  // ドラッグ＆ドロップ用（簡易実装）
  // 実際にはUIライブラリを使うのがいいが、今回は簡易的にクリック移動で実装
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // スコア計算
  const calculatedScores = useMemo(() => {
    const adjustments: Record<string, number> = {};
    
    room.players.forEach(p => {
        adjustments[p.id] = 0;
    });

    Array.from(groups.values()).forEach(playerIds => {
      // 2人以上のグループなら、その人数分スコア追加
      if (playerIds.length >= 2) {
        const points = playerIds.length;
        playerIds.forEach(pid => {
          adjustments[pid] = points;
        });
      }
    });
    return adjustments;
  }, [groups, room.players]);

  const movePlayerToGroup = (targetInfo: { groupId?: number, createNew?: boolean }) => {
    if (!selectedPlayerId) return;

    setGroups(prev => {
       const newGroups = new Map(prev);
       
       // 元のグループから削除
       for (const [gid, pids] of newGroups.entries()) {
           if (pids.includes(selectedPlayerId)) {
               const newPids = pids.filter(id => id !== selectedPlayerId);
               if (newPids.length === 0) {
                   newGroups.delete(gid);
               } else {
                   newGroups.set(gid, newPids);
               }
               break;
           }
       }

       // 新しいグループに追加
       if (targetInfo.createNew) {
           const newId = Math.max(-1, ...Array.from(newGroups.keys())) + 1;
           newGroups.set(newId, [selectedPlayerId]);
       } else if (targetInfo.groupId !== undefined) {
           const pids = newGroups.get(targetInfo.groupId) || [];
           newGroups.set(targetInfo.groupId, [...pids, selectedPlayerId]);
       }
       
       return newGroups;
    });
    setSelectedPlayerId(null);
  };

  const finalizeScores = async () => {
    if (!confirm("採点を確定して結果を発表しますか？")) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/finalize-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, adjustments: calculatedScores }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "操作に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isHost) {
      return (
          <div className="text-center py-10">
              <div className="text-5xl mb-4">💯</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">ホストが採点中...</h2>
              <p className="text-gray-600">
                表記ゆれなどをホストが確認しています。<br/>
                まもなく結果発表です！
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">採点調整</h2>
        <p className="text-gray-600 text-sm">
          回答をクリックして移動させることで、<br/>
          「実は同じ意味」の回答をまとめることができます。<br/>
          （2人以上同じグループになると得点になります）
        </p>
      </div>

      <div className="space-y-4">
          <div className="grid gap-4">
              {Array.from(groups.entries()).map(([groupId, playerIds]) => {
                  const groupAnswer = room.players.find(p => p.id === playerIds[0])?.answer;
                  const isMatch = playerIds.length >= 2;
                  
                  return (
                      <div 
                        key={groupId} 
                        className={`p-4 rounded-xl border-2 ${isMatch ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'}`}
                      >
                          <div className="flex justify-between items-center mb-2">
                             <h3 className="font-bold text-gray-700">{groupAnswer} グループ</h3>
                             {selectedPlayerId && !playerIds.includes(selectedPlayerId) && (
                                <button 
                                  onClick={() => movePlayerToGroup({ groupId })}
                                  className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                                >
                                    ここに移動
                                </button>
                             )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                              {playerIds.map(pid => {
                                  const player = room.players.find(p => p.id === pid);
                                  const isSelected = selectedPlayerId === pid;
                                  return (
                                      <button
                                        key={pid}
                                        onClick={() => setSelectedPlayerId(isSelected ? null : pid)}
                                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                            isSelected 
                                            ? 'bg-purple-600 text-white shadow-lg scale-105' 
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                      >
                                          <div className="font-bold">{player?.answer}</div>
                                          <div className="text-xs opacity-75">{player?.name}</div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  )
              })}
          </div>

          {selectedPlayerId && (
              <button
                onClick={() => movePlayerToGroup({ createNew: true })}
                className="w-full py-3 border-2 border-dashed border-gray-400 rounded-xl text-gray-500 hover:border-gray-600 hover:text-gray-700 transition"
              >
                  ＋ 新しいグループとして分離する
              </button>
          )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)] border-t">
         <div className="max-w-md mx-auto flex justify-between items-center">
             <div className="text-sm">
                 <div>現在の加点対象: <span className="font-bold text-purple-600">{Object.values(calculatedScores).filter(s => s > 0).length}人</span></div>
             </div>
             <button
                onClick={finalizeScores}
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition"
             >
                 {submitting ? "確定中..." : "採点を確定して結果へ"}
             </button>
         </div>
      </div>
      
      {/* Footer space filler */}
      <div className="h-20"></div>
    </div>
  );
}
