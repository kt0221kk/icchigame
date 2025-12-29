"use strict";
import { useState, useEffect, useRef } from "react";
import { Room } from "@/types/game";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DropAnimation,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ScoringPhaseProps = {
  room: Room;
  playerId: string;
};

type AnswerGroup = {
  id: string;             // 一意なID (dnd-kit用)
  answers: string[];      // このグループに含まれる回答文字列
  players: string[];      // この回答を出したプレイヤーID
  score: number;          // このグループの基礎点
};

// ソート可能なアイテム（プレイヤーの回答チップ）
function SortableItem({ id, player, isHost }: { id: string; player: any; isHost: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id, disabled: !isHost });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 select-none touch-none
        ${isHost 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white cursor-grab active:cursor-grabbing hover:scale-105 transition-transform' 
            : 'bg-gray-100 text-gray-700 cursor-default'}
      `}
    >
      <span>{player?.name}</span>
      <span className="font-bold bg-white/20 px-1.5 rounded text-xs">
         {player?.answer}
      </span>
    </div>
  );
}

// ドロップ可能なコンテナ（回答グループ）
function DroppableContainer({ 
  group, 
  items, 
  room, 
  isHost 
}: { 
  group: AnswerGroup; 
  items: string[]; 
  room: Room; 
  isHost: boolean 
}) {
  const { setNodeRef } = useSortable({ id: group.id, disabled: !isHost });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative bg-white border-2 rounded-xl p-4 shadow-sm transition-all duration-300 min-h-[100px]
        ${isHost ? 'border-purple-100 hover:border-purple-300' : 'border-gray-100'}
      `}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
            {group.score}点
          </span>
          <h3 className="font-bold text-gray-800 text-lg truncate">
             {/* グループ内の代表的な回答を表示 */}
             {items.length > 0 ? room.players.find(p => p.id === items[0])?.answer : "(空のグループ)"}
             {items.length > 1 && " など"}
          </h3>
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
          {items.length}人
        </span>
      </div>

      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-2">
          {items.map((pid) => (
            <SortableItem 
                key={pid} 
                id={pid} 
                player={room.players.find(p => p.id === pid)} 
                isHost={isHost} 
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}


export default function ScoringPhase({ room, playerId }: ScoringPhaseProps) {
  const isHost = room.players.find((p) => p.id === playerId)?.isHost;
  // AnswerGroupにidを追加した型を使うため、state初期化時は注意
  const [localGroups, setLocalGroups] = useState<AnswerGroup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const initializedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // クリックとドラッグの誤判定防止
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 初期化ロジックの抽出
  const calculateInitialGroups = () => {
        const answers = room.players
          .filter((p) => p.answer)
          .map((p) => ({ id: p.id, ans: p.answer! }));

        const groups: AnswerGroup[] = [];
        const processed = new Set<string>();

        let groupIdCounter = 0;

        answers.forEach((item) => {
            if (processed.has(item.id)) return;

            const sameAnswers = answers.filter((a) => a.ans === item.ans);
            sameAnswers.forEach((a) => processed.add(a.id));

            groups.push({
                id: `group-${groupIdCounter++}`,
                answers: [item.ans],
                players: sameAnswers.map((a) => a.id),
                score: Math.max(0, sameAnswers.length - 1),
            });
        });

        groups.sort((a, b) => b.score - a.score);
        return groups;
  };

  // 初期化と同期
  useEffect(() => {
    // サーバーデータの反映
    if (room.scoringGroups && room.scoringGroups.length > 0) {
      // room.scoringGroupsにはidがないので、あれば使い、なければ付与して比較
      const serverGroups = room.scoringGroups.map((g, i) => ({
          ...g,
          id: (g as any).id || `group-${i}` // 既存データにidがない場合のフォールバック
      }));

      // 簡易的な比較
      const currentPlayersSig = JSON.stringify(localGroups.map(g => g.players.sort()));
      const serverPlayersSig = JSON.stringify(serverGroups.map(g => g.players.sort()));

      if (currentPlayersSig !== serverPlayersSig) {
          setLocalGroups(serverGroups);
      }
    } 
    // 初回初期化
    else if (isHost && !initializedRef.current) {
        initializedRef.current = true;
        const groups = calculateInitialGroups();
        setLocalGroups(groups);
        syncToThinking(groups);
    }
  }, [room.scoringGroups, isHost, room.players]);


  const syncToThinking = async (groups: AnswerGroup[]) => {
      if (!isHost) return;
      try {
          await fetch(`/api/rooms/${room.code}/sync-scoring`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scoringGroups: groups }),
          });
      } catch (err) {
          console.error("Failed to sync scoring state", err);
      }
  };


  // ドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    if (!isHost) return;
    setActiveId(event.active.id as string);
  };

  // ドラッグ中（コンテナ間の移動）
  const handleDragOver = (event: DragOverEvent) => {
    if (!isHost) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // activeが所属するグループを探す
    const activeGroupIndex = localGroups.findIndex(g => g.players.includes(activeId));
    // overがグループIDか、プレイヤーIDか判定
    let overGroupIndex = localGroups.findIndex(g => g.id === overId);
    if (overGroupIndex === -1) {
        // overがプレイヤーIDの場合、そのプレイヤーが所属するグループを探す
        overGroupIndex = localGroups.findIndex(g => g.players.includes(overId));
    }

    if (activeGroupIndex !== -1 && overGroupIndex !== -1 && activeGroupIndex !== overGroupIndex) {
        setLocalGroups((prev) => {
            const next = [...prev];
            // IDの重複を防ぐため、単純コピーではなく新しいオブジェクトとして扱うべきだが、
            // ここでは簡易的に参照コピーで処理（Reactのstate更新としては不完全だが、直後のDragEndで同期される）
            
            // 元のグループから削除
            next[activeGroupIndex] = {
                ...next[activeGroupIndex],
                players: next[activeGroupIndex].players.filter(p => p !== activeId)
            };
            
            // 新しいグループに追加
            next[overGroupIndex] = {
                ...next[overGroupIndex],
                players: [...next[overGroupIndex].players, activeId]
            };

             // スコア再計算
            next[activeGroupIndex].score = Math.max(0, next[activeGroupIndex].players.length - 1);
            next[overGroupIndex].score = Math.max(0, next[overGroupIndex].players.length - 1);
            
            return next;
        });
    }
  };

  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    if (!isHost) return;
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;
    
    // 最終的な同期 & ゴミ掃除
    const cleanedGroups = localGroups.filter(g => g.players.length > 0);
    
    // state更新とサーバー同期
    setLocalGroups(cleanedGroups);
    syncToThinking(cleanedGroups);
  };

  // 新規グループ作成（ボタン操作用）
  const createNewGroup = () => {
      const newGroup: AnswerGroup = {
          id: `group-${Date.now()}`,
          answers: [],
          players: [],
          score: 0
      };
      setLocalGroups([...localGroups, newGroup]);
  };
  
  // リセット
  const handleReset = () => {
      if (!confirm("グループ分けを自動判定の初期状態に戻しますか？")) return;
      const groups = calculateInitialGroups();
      setLocalGroups(groups);
      syncToThinking(groups);
  };

  const handleFinalize = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
        const adjustments: Record<string, number> = {};
        localGroups.forEach(group => {
            group.players.forEach(pid => {
                adjustments[pid] = group.score;
            });
        });

      await fetch(`/api/rooms/${room.code}/finalize-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, adjustments, scoringGroups: localGroups }), 
      });
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };
  
  const dropAnimation: DropAnimation = {
      sideEffects: defaultDropAnimationSideEffects({
        styles: {
          active: {
            opacity: '0.5',
          },
        },
      }),
    };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
          採点調整タイム
        </h2>
        <p className="text-gray-600 mt-2 text-sm">
          {isHost
            ? "同じ意味の回答をドラッグ＆ドロップでまとめてください"
            : "ホストが採点を調整中です..."}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4 pb-24">
            <SortableContext items={localGroups.map(g => g.id)} strategy={rectSortingStrategy}>
              {localGroups.map((group) => (
                <DroppableContainer 
                    key={group.id} 
                    group={group} 
                    items={group.players} // SortableContextはこの中で定義
                    room={room} 
                    isHost={!!isHost} 
                />
              ))}
            </SortableContext>
            
            {/* 新規グループ作成エリア（空のドロップゾーンとして機能させるか、ボタンで追加してそこにドロップさせるか） */}
             {isHost && (
                <div 
                    onClick={createNewGroup}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors text-gray-400 gap-2"
                >
                    <span>＋ 新しいグループを追加</span>
                </div>
            )}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
            {activeId ? (
                <SortableItem 
                    id={activeId} 
                    player={room.players.find(p => p.id === activeId)} 
                    isHost={true} 
                />
            ) : null}
        </DragOverlay>
      </DndContext>

      {isHost && (
        <div className="fixed bottom-6 left-0 right-0 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto flex flex-col gap-3">
            <button
                onClick={handleReset}
                className="w-full bg-white text-gray-700 font-bold py-3 rounded-xl shadow-md border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all text-sm"
            >
                ↻ 最初の状態にリセット
            </button>

            <button
              onClick={handleFinalize}
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "確定中..." : "採点を確定して結果へ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
