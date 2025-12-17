import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WS_BASE_URL } from "../config";

/**
 * Figgie Trading Page
 * - 使用内联 style（React CSSProperties）
 * - 不依赖 Tailwind / 外部样式文件
 * - 保证单文件、自包含、与现有页面风格解耦
 */

export type Suit = "spade" | "club" | "diamond" | "heart";

const SUITS: { suit: Suit; label: string; color: string }[] = [
  { suit: "spade", label: "♠", color: "#e57373" },
  { suit: "club", label: "♣", color: "#81c784" },
  { suit: "diamond", label: "♦", color: "#ffeb3b" },
  { suit: "heart", label: "♥", color: "#ffb74d" },
];

// 和 Room 页一致，临时使用同一个真人头像
const SELF_AVATAR_URL = "https://img.icons8.com/arcade/64/user-male.png";

// 所有玩家在对局中的状态（含机器人）
type PlayerState = {
  id: string;
  name: string;
  totalCards: number;
  chipValue: number;
  // 顺序固定：spade, club, diamond, heart
  suitDeltas: number[];
  color: string;
};

// 当前玩家的初始手牌（后续可从后端填充真实数据）
type UserInitialCards = Record<Suit, number>;
type SuitPrice = {
  buyer: string;
  bid: number;
  seller: string
  ask: number
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#6b4a8f",
    color: "white",
    fontFamily: "sans-serif",
  },
  header: {
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    background: "#5a3d7a",
  },
  main: {
    display: "flex",
    padding: 16,
    gap: 16,
  },
  left: { flex: 3 },
  right: {
    flex: 1,
    background: "white",
    color: "black",
    padding: 12,
    overflowY: "auto",
    maxHeight: "calc(100vh)",
  },
  card: {
    background: "white",
    color: "black",
    borderRadius: 6,
    padding: 8,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "12vh",
    borderRadius: 6,
    marginTop: 10,
    padding: "10px 10px",
  },
  button: {
    padding: "4px 8px",
    marginLeft: 4,
    cursor: "pointer",
  },
  priceAdjustButton: {
    padding: "2px 4px",
    borderRadius: 6,
    border: "1px solid #d9dfea",
    background: "#f4f6fb",
    color: "#1f2a44",
    cursor: "pointer",
    fontSize: 12,
  },
  countdownBox: {
    marginRight: 18,
    background: "#fff",
    color: "#6b4a8f",
    borderRadius: 8,
    padding: "6px 16px",
    fontWeight: 700,
    fontSize: 18,
    width: 100,
    textAlign: "center",
    boxShadow: "0 2px 10px 0 rgba(63,27,100,0.07)",
    letterSpacing: 2,
    userSelect: "none",
  },
  endIconButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: "none",
    background: "rgba(255,255,255,0.16)",
    color: "#ffe9ec",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 16,
  },
  dialogBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  dialogCard: {
    width: 320,
    background: "#ffffff",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
    color: "#1f2a44",
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 8,
  },
  dialogText: {
    fontSize: 14,
    opacity: 0.75,
    marginBottom: 18,
  },
  dialogActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  dialogSecondaryButton: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid #d0d7e2",
    background: "#ffffff",
    color: "#1f2a44",
    cursor: "pointer",
    fontSize: 13,
  },
  dialogPrimaryButton: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "none",
    background: "#e53935",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
  },
};

// 倒计时组件，接收一个 UNIX 时间戳作为起始，4分钟倒计时
function CountdownBox({ startTimestamp }: { startTimestamp: number }) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, 4 * 60 - (now - startTimestamp));
  });
  // 浏览器环境使用 number 作为定时器标识，避免依赖 NodeJS 类型
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // 立即计一次
    function update() {
      const now = Math.floor(Date.now() / 1000);
      // 剩余秒数
      const left = Math.max(0, 4 * 60 - (now - startTimestamp));
      setSecondsLeft(left);
      if (left <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    intervalRef.current = window.setInterval(update, 1000);
    update();
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [startTimestamp]);

  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  const paddedSec = sec < 10 ? `0${sec}` : sec;
  return (
    <span style={styles.countdownBox}>
      {min}:{paddedSec}
    </span>
  );
}

export default function FiggieTradingPage() {
  // 假设传入 unix startTimestamp，演示初始为页面打开那刻
  const [startTimestamp] = useState(() => Math.floor(Date.now() / 1000));
  const [round] = useState(1);
  const [showEndDialog, setShowEndDialog] = useState(false);

  const navigate = useNavigate();

  const { state } = useLocation();
  const payload = state?.payload;

  if (!payload) {
    return <div>非法进入 game 页面</div>;
  }

  const playersCount = payload.players.length;
  // 柔和、低饱和度的配色，便于区分且不刺眼
  const PLAYER_COLORS = ["#7293e6", "#75c9a3", "#e9c17d", "#c8a5e6", "#ee9fa7"];

  // 全部玩家（含自己 + 机器人）的状态，当前用占位数据，后续可从后端 real-time 更新
  const playerStates: PlayerState[] = payload.players.map((p: any, idx: number) => ({
    id: p.id,
    name: p.name,
    totalCards: 10,
    chipValue: 350 - (playersCount == 4 ? 50 : 40),
    suitDeltas: [0, 0, 0, 0],
    color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
  }));

  // 当前用户在 playerStates 中视为第一个
  const selfState = playerStates[0];

  // 当前玩家初始手牌（可在接入引擎后替换为真实数据）
  const userInitialCards: UserInitialCards = {
    spade: 4,
    club: 3,
    diamond: 2,
    heart: 1,
  };

  const suitPrices: Record<Suit, SuitPrice> = {
    spade: { seller: "卖家A", ask: 10, buyer: "买家D", bid: 2 },
    club: { seller: "卖家C", ask: 2, buyer: "", bid: 0 },
    diamond: { seller: "", ask: 0, buyer: "买家B", bid: 3 },
    heart: { seller: "卖家D", ask: 20, buyer: "买家B", bid: 7 },
  };

  const selfSuitLines = SUITS.map((suitMeta, idx) => {
    const delta = selfState.suitDeltas[idx] ?? 0;
    const base = userInitialCards[suitMeta.suit];
    const current = base + delta;
    return { ...suitMeta, delta, current };
  });

  const wsRef = useRef<WebSocket | null>(null);
  const room_id = payload.room_id;
  const player_id = payload.players[0].id;

  useEffect(() => {
    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/${room_id}/${player_id}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS connected");
    };

    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   console.log("event from server:", data);
    // };

    // ws.send(JSON.stringify({
    //   type: "PlaceBid",
    //   suit: "Spade",
    //   price: 120,
    // }));

    ws.onerror = (err) => {
      console.error("WS error", err);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [room_id, player_id]); 

  const handleEndGameClick = () => {
    setShowEndDialog(true);
  };

  const handleCancelEndGame = () => {
    setShowEndDialog(false);
  };

  const handleConfirmEndGame = () => {
    setShowEndDialog(false);
    navigate("/");
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <CountdownBox startTimestamp={startTimestamp} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600 }}>{payload.roomName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Round {round}</div>
          <button
            style={styles.endIconButton}
            onClick={handleEndGameClick}
            title="结束本局"
            aria-label="结束本局"
          >
            ⏹
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Left */}
        <section style={styles.left}>
          {/* 当前玩家（CardHoarder 区域） */}
          <div
            style={{
              ...styles.card,
              background: selfState.color,
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              padding: 10,
            }}
          >
            {/* 左侧：玩家名 + 头像 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center", // 垂直居中
                gap: 8,
                flex: 1,
              }}
            >
              <div>
                <img
                  src={SELF_AVATAR_URL}
                  alt={payload.players[0]?.name}
                  width={40}
                  height={40}
                  style={{
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.8)",
                    background: "#ecf2fa",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    display: "block",
                  }}
                />
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  marginTop: 8,
                  textAlign: "center",
                  display: "block",
                  lineHeight: 1.2,
                }}
              >
                {payload.players[0]?.name}
              </span>
            </div>

            {/* 右侧：四个花色列 + 筹码价值列 */}
            <div
              style={{
                flex: 4,
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 30,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              {selfSuitLines.map(({ suit, label, current, delta }) => (
                <div
                  key={suit}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    background: "#f6f7fa",
                    borderRadius: 8,
                    padding: "7px 4px 7px 8px",
                    minHeight: 56,
                    minWidth: 0,
                  }}
                >
                  {/* 左侧花色，突出放大 */}
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      minWidth: 28,
                      marginRight: 6,
                      color: "#5866c4",
                      textShadow: "0 1px 4px #dde1f5"
                    }}
                  >
                    {label}
                  </span>
                  {/* 右侧: current 与 delta 列 */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                    }}
                  >
                    {/* current 数量 */}
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 20,
                        color: "#232b47",
                        lineHeight: 1.12,
                      }}
                    >
                      {current}
                    </span>
                    {/* delta */}
                    <span
                      style={{
                        fontSize: 12,
                        marginTop: 2,
                        fontWeight: 600,
                        color:
                          delta > 0
                            ? "#30b267"
                            : delta < 0
                            ? "#e53935"
                            : "#b8bfd9",
                        opacity: delta === 0 ? 0.65 : 1,
                        lineHeight: 1.1,
                        letterSpacing: 1,
                      }}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                </div>
              ))}

              {/* 筹码价值列 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingRight: 4,
                  background: "#f2e5fa",
                  borderRadius: 8,
                  minHeight: 56,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 20, color: "#7c5096", lineHeight: 1.11 }}>
                  ¥{selfState.chipValue}
                </span>
                <span style={{ fontSize: 13, opacity: 0.9, color: "#7c5096", marginTop: 2 }}>
                  手中 {selfState.totalCards} 张
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${playerStates.length - 1}, 1fr)`,
              gap: 10,
              marginBottom: 12,
            }}
          >
            {playerStates.slice(1).map((p) => (
              <div
                key={p.id}
                style={{
                  ...styles.card,
                  minWidth: 0,
                  background: p.color,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  color: "#1e2438",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, color: "#4a5568" }}>
                    <div>¥{p.chipValue}</div>
                    <div>手中 {p.totalCards} 张</div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 6,
                  }}
                >
                  {SUITS.map(({ suit, label }, idx) => {
                    const delta = p.suitDeltas[idx] ?? 0;
                    return (
                      <div
                        key={suit}
                        style={{
                          background: "#f6f7fb",
                          borderRadius: 8,
                          padding: "6px 4px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#5964b9" }}>
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              delta > 0
                                ? "#2eaf61"
                                : delta < 0
                                ? "#e53935"
                                : "#9aa2c7",
                          }}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {SUITS.map(({ suit, label }) => {
            const priceLine = suitPrices[suit];
            return (
              <div
                key={suit}
                style={{
                  ...styles.row,
                  background: "#ffffff",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                  gap: 8,
                }}
              >
                {/* 左侧买入信息 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    alignItems: "center", // 水平居中
                    flex: 1,
                    borderRadius: 6,
                    height: "100%",
                  }}
                >
                  {/* 上半：市场上其它玩家的买入意向 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      justifyContent: "center", // 水平居中
                      flex: 1,
                      width: "100%",
                    }}
                  >
                    {priceLine.buyer ? (
                      <span style={{ fontSize: 13, color: "#1f2a44" }}>
                        <strong>{priceLine.buyer}</strong> 愿意以{" "}
                        <span style={{ fontSize: 14, fontWeight: 800 }}>¥{priceLine.bid}</span>
                        {" "}
                        <button style={styles.priceAdjustButton}>▲</button>
                        {" "}
                        买入 {label}
                        <button
                          style={{
                            padding: "6px 14px",
                            marginLeft: 10,
                            borderRadius: 999,
                            border: "none",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.35)",
                          }}
                        >
                          卖
                        </button>
                      </span>
                    ) : null}
                  </div>
                  {/* 下半：你自己的买入意向（含可编辑价格） */}
                  <div
                    style={{
                      flex: 1,
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#1f2a44",
                      justifyContent: "center", // 水平居中
                    }}
                  >
                    <span>你愿意以</span>
                    <input
                      type="number"
                      defaultValue={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          // 之后可在这里接入实际更新逻辑
                          e.currentTarget.blur();
                        }
                      }}
                      style={{
                        width: 50,
                        padding: "3px 6px",
                        borderRadius: 6,
                        border: "1px solid #d0d7e2",
                        fontSize: 13,
                        textAlign: "right",
                      }}
                    />
                    <span>¥ 买入 {label}</span>
                  </div>
                </div>

                {/* 中间：花色圆形标识 */}
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#0f172a",
                      color: "#ffffff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
                    }}
                  >
                    {label}
                  </span>
                </div>

                {/* 右侧：卖出信息 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flex: 1,
                    borderRadius: 6,
                    height: "100%",
                  }}
                >
                  {/* 上半：市场上其它玩家的卖出意向 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      justifyContent: "center", // 使内容水平居中
                      flex: 1,
                      width: "100%",
                    }}
                  >
                    {priceLine.seller ? (
                      <span style={{ fontSize: 13, color: "#1f2a44" }}>
                        <strong>{priceLine.seller}</strong> 愿意以{" "}
                        <span style={{ fontSize: 14, fontWeight: 800 }}>¥{priceLine.ask}</span>
                        {" "}
                        <button style={styles.priceAdjustButton}>▼</button>
                        {" "}
                        卖出 {label}
                        <button
                          style={{
                            padding: "6px 14px",
                            marginLeft: 10,
                            borderRadius: 999,
                            border: "none",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.35)",
                          }}
                        >
                          买
                        </button>
                      </span>
                    ) : null}
                  </div>
                  {/* 下半：你自己的卖出意向（含可编辑价格） */}
                  <div
                    style={{
                      flex: 1,
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#1f2a44",
                      justifyContent: "center", // 使内容水平居中
                    }}
                  >
                    <span>你愿意以</span>
                    <input
                      type="number"
                      defaultValue={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          // 之后可在这里接入实际更新逻辑
                          e.currentTarget.blur();
                        }
                      }}
                      style={{
                        width: 50,
                        padding: "3px 6px",
                        borderRadius: 6,
                        border: "1px solid #d0d7e2",
                        fontSize: 13,
                        textAlign: "right",
                      }}
                    />
                    <span>¥ 卖出 {label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Right */}
        <aside style={styles.right}>
          <h3>Trade History</h3>
          <table style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th align="left">Buyer</th>
                <th>Suit</th>
                <th align="left">Seller</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td>Bot</td>
                  <td align="center">♠</td>
                  <td>Trader</td>
                  <td align="center">5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </main>

      {showEndDialog && (
        <div style={styles.dialogBackdrop}>
          <div style={styles.dialogCard}>
            <div style={styles.dialogTitle}>结束本局游戏？</div>
            <div style={styles.dialogText}>
              当前房间 <strong>{payload.roomName}</strong> · Round {round}
              <br />
              结束后将返回主页，无法继续本局。
            </div>
            <div style={styles.dialogActions}>
              <button
                type="button"
                style={styles.dialogSecondaryButton}
                onClick={handleCancelEndGame}
              >
                继续游戏
              </button>
              <button
                type="button"
                style={styles.dialogPrimaryButton}
                onClick={handleConfirmEndGame}
              >
                结束本局
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
