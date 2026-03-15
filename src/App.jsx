import React, { useMemo, useState } from "react";

const DEFAULT_PLAYERS = ["プレイヤー1", "プレイヤー2"];
const POINT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function getRankedPlayers(players) {
  return [...players].sort((a, b) => {
    if (a.won !== b.won) return a.won ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.misses - b.misses;
  });
}

export default function App() {
  const [players, setPlayers] = useState(
    DEFAULT_PLAYERS.map((name, index) => ({
      id: index + 1,
      name,
      score: 0,
      misses: 0,
      rounds: [],
      isOut: false,
      won: false,
    }))
  );
  const [currentPlayerId, setCurrentPlayerId] = useState(1);
  const [selectedPoint, setSelectedPoint] = useState(1);
  const [message, setMessage] = useState("開始してください");

  const currentPlayer = players.find((p) => p.id === currentPlayerId) ?? players[0];
  const ranking = useMemo(() => getRankedPlayers(players), [players]);

  const moveToNextPlayer = (nextPlayers, actingPlayerId) => {
    const winnerExists = nextPlayers.some((p) => p.won);
    if (winnerExists) return;

    const stillActive = nextPlayers.filter((p) => !p.isOut);
    if (stillActive.length === 0) return;

    const currentIndex = stillActive.findIndex((p) => p.id === actingPlayerId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % stillActive.length;
    setCurrentPlayerId(stillActive[nextIndex].id);
  };

  const applyTurn = (type, point = 0) => {
    if (!currentPlayer || currentPlayer.isOut || currentPlayer.won) return;

    const nextPlayers = players.map((player) => {
      if (player.id !== currentPlayer.id) return player;

      if (type === "miss") {
        const nextMisses = player.misses + 1;
        const out = nextMisses >= 3;
        return {
          ...player,
          misses: nextMisses,
          isOut: out,
          rounds: [...player.rounds, { type: "miss", point: 0 }],
        };
      }

      const provisionalScore = player.score + point;
      const adjustedScore = provisionalScore > 50 ? 25 : provisionalScore;
      const won = adjustedScore === 50;

      return {
        ...player,
        score: adjustedScore,
        misses: 0,
        won,
        rounds: [...player.rounds, { type: "score", point, adjustedScore }],
      };
    });

    const updatedCurrent = nextPlayers.find((p) => p.id === currentPlayer.id);

    if (type === "miss") {
      if (updatedCurrent?.isOut) {
        setMessage(`${currentPlayer.name} は3回ミスで脱落です`);
      } else {
        setMessage(`${currentPlayer.name} はミス。連続ミス ${updatedCurrent?.misses ?? 0} 回`);
      }
    } else if (updatedCurrent?.won) {
      setMessage(`${currentPlayer.name} の勝ち！ちょうど50点です`);
    } else if ((updatedCurrent?.score ?? 0) === 25 && currentPlayer.score + point > 50) {
      setMessage(`${currentPlayer.name} は50点を超えたため25点に戻ります`);
    } else {
      setMessage(`${currentPlayer.name} に ${point} 点を加算しました`);
    }

    setPlayers(nextPlayers);
    moveToNextPlayer(nextPlayers, currentPlayer.id);
  };

  const addPlayer = () => {
    const nextId = players.length ? Math.max(...players.map((p) => p.id)) + 1 : 1;
    const nextName = `プレイヤー${players.length + 1}`;

    setPlayers([
      ...players,
      {
        id: nextId,
        name: nextName,
        score: 0,
        misses: 0,
        rounds: [],
        isOut: false,
        won: false,
      },
    ]);
    setMessage(`${nextName} を追加しました`);
  };

  const removePlayer = (id) => {
    if (players.length <= 1) {
      setMessage("プレイヤーは1人以上必要です");
      return;
    }

    const removedPlayer = players.find((p) => p.id === id);
    const nextPlayers = players.filter((p) => p.id !== id);

    setPlayers(nextPlayers);

    if (currentPlayerId === id) {
      setCurrentPlayerId(nextPlayers[0].id);
    }

    setMessage(`${removedPlayer?.name ?? "プレイヤー"} を削除しました`);
  };

  const updatePlayerName = (id, value) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: value || `プレイヤー${id}` } : p))
    );
  };

  const resetGame = () => {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        score: 0,
        misses: 0,
        rounds: [],
        isOut: false,
        won: false,
      }))
    );
    setCurrentPlayerId(players[0]?.id ?? 1);
    setMessage("ゲームをリセットしました");
  };

  const undoLast = () => {
    const previousPlayer = [...players]
      .filter((p) => p.rounds.length > 0)
      .sort((a, b) => b.rounds.length - a.rounds.length)[0];

    if (!previousPlayer) {
      setMessage("取り消せる記録がありません");
      return;
    }

    const lastRound = previousPlayer.rounds[previousPlayer.rounds.length - 1];

    const nextPlayers = players.map((p) => {
      if (p.id !== previousPlayer.id) return p;

      const trimmed = p.rounds.slice(0, -1);
      let score = 0;
      let misses = 0;
      let isOut = false;
      let won = false;

      for (const r of trimmed) {
        if (r.type === "miss") {
          misses += 1;
          if (misses >= 3) isOut = true;
        } else {
          misses = 0;
          score += r.point;
          if (score > 50) score = 25;
          if (score === 50) won = true;
        }
      }

      return { ...p, rounds: trimmed, score, misses, isOut, won };
    });

    setPlayers(nextPlayers);
    setCurrentPlayerId(previousPlayer.id);
    setMessage(
      `直前の記録（${previousPlayer.name}: ${lastRound.type === "miss" ? "ミス" : `${lastRound.point}点`}）を取り消しました`
    );
  };

  const cardStyle = (isCurrent) => ({
    background: "white",
    border: isCurrent ? "2px solid #0f172a" : "1px solid #cbd5e1",
    borderRadius: "20px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  });

  const buttonBase = {
    padding: "14px 18px",
    borderRadius: "14px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "16px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif',
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "16px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "48px", textAlign: "center" }}>モルック 点計算アプリ</h1>
          <p style={{ marginTop: "12px", textAlign: "center", color: "#64748b", fontSize: "18px" }}>
            50点ちょうどで勝利 / 50点超えは25点に戻る / 3回ミスで脱落
          </p>
          <div
            style={{
              marginTop: "12px",
              textAlign: "center",
              fontWeight: "700",
              fontSize: "18px",
              color: "#334155",
            }}
          >
            {message}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {players.map((player) => (
            <div key={player.id} style={cardStyle(currentPlayerId === player.id)}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                <input
                  value={player.name}
                  onChange={(e) => updatePlayerName(player.id, e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1px solid #94a3b8",
                    borderRadius: "12px",
                    fontSize: "16px",
                  }}
                />
                <button
                  onClick={() => removePlayer(player.id)}
                  style={{
                    ...buttonBase,
                    padding: "10px 12px",
                    background: "#fff1f2",
                    color: "#b91c1c",
                    border: "1px solid #fecdd3",
                    flexShrink: 0,
                  }}
                >
                  削除
                </button>
              </div>

              <div style={{ fontSize: "40px", fontWeight: "800", textAlign: "center", color: "#334155" }}>
                {player.score}
              </div>
              <div style={{ textAlign: "center", marginTop: "12px", color: "#64748b", fontSize: "18px" }}>ミス: {player.misses}</div>
              <div style={{ textAlign: "center", marginTop: "12px", fontWeight: "700", fontSize: "18px" }}>
                {player.won ? "勝利" : player.isOut ? "脱落" : currentPlayerId === player.id ? "手番" : "待機"}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "16px" }}>得点入力</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            {POINT_OPTIONS.map((point) => (
              <button
                key={point}
                onClick={() => setSelectedPoint(point)}
                style={{
                  ...buttonBase,
                  height: "60px",
                  background: selectedPoint === point ? "#0f172a" : "white",
                  color: selectedPoint === point ? "white" : "#111827",
                  border: "1px solid #cbd5e1",
                  fontSize: "22px",
                }}
              >
                {point}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <button
              onClick={() => applyTurn("score", selectedPoint)}
              style={{
                ...buttonBase,
                background: "#0f172a",
                color: "white",
                border: "none",
                minHeight: "58px",
              }}
            >
              {selectedPoint}点を確定
            </button>

            <button
              onClick={() => applyTurn("miss")}
              style={{
                ...buttonBase,
                background: "#fff7ed",
                color: "#9a3412",
                border: "1px solid #fdba74",
                minHeight: "58px",
              }}
            >
              ミスを記録
            </button>

            <button
              onClick={undoLast}
              style={{
                ...buttonBase,
                background: "#f8fafc",
                color: "#334155",
                border: "1px solid #cbd5e1",
                minHeight: "58px",
              }}
            >
              取り消し
            </button>

            <button
              onClick={resetGame}
              style={{
                ...buttonBase,
                background: "#f8fafc",
                color: "#334155",
                border: "1px solid #cbd5e1",
                minHeight: "58px",
              }}
            >
              リセット
            </button>

            <button
              onClick={addPlayer}
              style={{
                ...buttonBase,
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #93c5fd",
                minHeight: "58px",
              }}
            >
              プレイヤーを追加
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "28px" }}>順位</h2>
            {ranking.map((player, index) => (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ color: "#64748b", fontSize: "14px" }}>#{index + 1}</div>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>{player.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "800", fontSize: "24px" }}>{player.score}</div>
                  <div style={{ color: "#64748b", fontSize: "13px" }}>ミス {player.misses}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "white",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "28px" }}>ルールメモ</h2>
            <p>・50点ちょうどで勝ち</p>
            <p>・50点を超えたら25点に戻る</p>
            <p>・ミス3回連続で脱落</p>
            <p>・点を入れるとミス回数は0に戻る</p>
          </div>
        </div>
      </div>
    </div>
  );
}