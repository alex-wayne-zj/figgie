import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WS_BASE_URL } from "../config/network";
import type {
  Suit,
  PlayerState,
  PlayerCards,
  SuitPrice,
  Event,
  Action,
  Side,
  TradeExecutedPayload,
  RoundEndedPlayerState,
} from "../types/game";
import { SUITS, suitToSymbol } from "../types/game";
import "./Game.css";

// 柔和、低饱和度的配色，便于区分且不刺眼
const PLAYER_COLORS = ["#7293e6", "#75c9a3", "#e9c17d", "#c8a5e6", "#ee9fa7"];
const GAME_TIME = 240;

// 倒计时组件，接收一个 UNIX 时间戳作为起始，4分钟倒计时
function CountdownBox({
  startTimestamp,
  endRound,
}: {
  startTimestamp: number;
  endRound?: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  // 浏览器环境使用 number 作为定时器标识，避免依赖 NodeJS 类型
  const intervalRef = useRef<number | null>(null);
  const hasEndedRef = useRef(false);
  const endRoundRef = useRef(endRound);

  useEffect(() => {
    endRoundRef.current = endRound;
  }, [endRound]);

  useEffect(() => {
    // 立即计一次
    hasEndedRef.current = false;

    function update() {
      const now = Math.floor(Date.now() / 1000);
      // 剩余秒数
      const left = Math.max(0, GAME_TIME - (now - startTimestamp));
      setSecondsLeft(left);
      if (left <= 0 && !hasEndedRef.current) {
        hasEndedRef.current = true;

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        endRoundRef.current?.();
      }
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(update, 1000);
    update();

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [startTimestamp]);

  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  const paddedSec = sec < 10 ? `0${sec}` : sec;
  return (
    <span className="countdownBox">
      {min}:{paddedSec}
    </span>
  );
}

export default function FiggieTradingPage() {
  // 假设传入 unix startTimestamp，演示初始为页面打开那刻
  const [startTimestamp, setStartTimeStamp] = useState(() =>
    Math.floor(Date.now() / 1000)
  );
  const [round, setRound] = useState(1);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showRoundEndDialog, setShowRoundEndDialog] = useState(false);
  const [goalSuit, setGoalSuit] = useState("♥");
  const [roundEndedPlayerStates, setRoundEndedPlayerStates] = useState<
    RoundEndedPlayerState[]
  >([]);
  const [tradeHistory, setTradeHistory] = useState<TradeExecutedPayload[]>([]);

  const navigate = useNavigate();
  const { state } = useLocation();

  const payload = state?.payload;
  if (!payload) {
    return <div>非法进入 game 页面</div>;
  }
  const playersCount = payload.players.length;
  const room_id = payload.room_id;
  const player_id = payload.players[0].id;

  const playerIdNameMap = useMemo(() => {
    const map = new Map<string, string>();
    payload.players.forEach((p: any) => {
      map.set(p.id, p.name);
    });
    return map;
  }, [payload.players]);

  const getPlayerNameById = (id: string): string | undefined =>
    playerIdNameMap.get(id);

  const playerNameIdMap = useMemo(() => {
    const map = new Map<string, string>();
    payload.players.forEach((p: any) => {
      map.set(p.name, p.id);
    });
    return map;
  }, [payload.players]);

  const getPlayerIdByName = (name: string): string | undefined =>
    playerNameIdMap.get(name);

  // 全部玩家（含自己 + 机器人）的状态，后续从后端 real-time 更新
  const [playerStates, setPlayerStates] = useState<PlayerState[]>(
    payload.players.map((p: any, idx: number) => ({
      id: p.id,
      name: p.name,
      totalCards: playersCount == 4 ? 10 : 8,
      cash: 350 - (playersCount == 4 ? 50 : 40),
      suitDeltas: [0, 0, 0, 0],
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    }))
  );

  const playerColorMap = new Map(playerStates.map((p) => [p.id, p.color]));

  function getPlayerColor(playerId: string | undefined): string {
    if (playerId === undefined) {
      return "red";
    }
    const color = playerColorMap.get(playerId);
    if (color === undefined) {
      return "red";
    }
    return color;
  }

  // 当前用户在 playerStates 中视为第一个
  const selfState = playerStates[0];

  // 当前玩家初始手牌（可在接入引擎后替换为真实数据）
  const [playerCards, setPlayerCards] = useState<PlayerCards>({
    Spade: 0,
    Club: 0,
    Diamond: 0,
    Heart: 0,
  });

  const [suitPrices, setSuitPrices] = useState<Record<Suit, SuitPrice>>({
    Spade: { seller: "", ask: 0, buyer: "", bid: 0 },
    Club: { seller: "", ask: 0, buyer: "", bid: 0 },
    Diamond: { seller: "", ask: 0, buyer: "", bid: 0 },
    Heart: { seller: "", ask: 0, buyer: "", bid: 0 },
  });

  const selfSuitLines = SUITS.map((suitMeta, idx) => {
    const delta = selfState.suitDeltas[idx] ?? 0;
    const base = playerCards[suitMeta.suit];
    const current = base + delta;
    return { ...suitMeta, delta, current };
  });

  const wsRef = useRef<WebSocket | null>(null);

  const placeQuote = (suit: Suit, side: Side, price: number) => {
    const action: Action = {
      type: "PlaceQuote",
      payload: {
        player_id: player_id,
        suit,
        side,
        price,
      },
    };
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify(action));
    }
  };

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/${room_id}/${player_id}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS connected");
    };

    ws.onmessage = (event) => {
      try {
        const data: Event = JSON.parse(event.data);
        console.log("event from server:", data);

        if (data.type === "TradeExecuted") {
          const { buyer, seller, suit, price } = data.payload;
          // 清空 suitPrices
          setSuitPrices({
            Spade: { seller: "", ask: 0, buyer: "", bid: 0 },
            Club: { seller: "", ask: 0, buyer: "", bid: 0 },
            Diamond: { seller: "", ask: 0, buyer: "", bid: 0 },
            Heart: { seller: "", ask: 0, buyer: "", bid: 0 },
          });
          // 更新 suitDeltas, cash, totalCards
          setPlayerStates((prev) =>
            prev.map((p) => {
              let newDeltas = [...p.suitDeltas];
              let newTotalCards = p.totalCards;
              let newCash = p.cash;

              const suitIndex = SUITS.findIndex((s) => s.suit === suit);
              if (suitIndex === -1) return p;

              if (p.id === buyer) {
                newDeltas[suitIndex] += 1;
                newTotalCards += 1;
                newCash -= price;
              } else if (p.id === seller) {
                newDeltas[suitIndex] -= 1;
                newTotalCards -= 1;
                newCash += price;
              }

              return {
                ...p,
                suitDeltas: newDeltas,
                totalCards: newTotalCards,
                cash: newCash,
              };
            })
          );
          // 更新 trade history
          const newTrade: TradeExecutedPayload = {
            buyer: getPlayerNameById(buyer) ?? buyer,
            seller: getPlayerNameById(seller) ?? seller,
            suit,
            price,
          };
          setTradeHistory((prev) => [...prev, newTrade]);
        }
        if (data.type === "QuotePlaced") {
          const { quote } = data.payload;
          const { player_id, suit, side, price } = quote;
          setSuitPrices((prev) => {
            const prevSuit = prev[suit];
            return {
              ...prev,
              [suit]: {
                ...prevSuit,
                ...(side === "Bid"
                  ? {
                      buyer: getPlayerNameById(player_id) ?? player_id,
                      bid: price,
                    }
                  : {
                      seller: getPlayerNameById(player_id) ?? player_id,
                      ask: price,
                    }),
              },
            };
          });
        }
        if (data.type === "RoundStarted") {
          const { round_id, server_time, player } = data.payload;
          if (player.info.id !== selfState.id) {
            console.log("Player id not match");
            return;
          }
          setPlayerCards({
            Spade: player.hand.Spade ?? 0,
            Club: player.hand.Club ?? 0,
            Diamond: player.hand.Diamond ?? 0,
            Heart: player.hand.Heart ?? 0,
          });
          setRound(round_id);
        }
        if (data.type === "RoundEnded") {
          const payload = data.payload;
          setGoalSuit(suitToSymbol(payload.goal_suit));
          if (payload.round_id !== round) {
            console.log("Round ID don't match");
          }
          const sortedPlayers = [...data.payload.players].sort(
            (a, b) => b.cash - a.cash
          );
          const playerStateMap = new Map(playerStates.map((p) => [p.id, p]));
          setRoundEndedPlayerStates(() => {
            return sortedPlayers.map((p, index) => {
              const prev = playerStateMap.get(p.info.id);
              return {
                id: p.info.id,
                name: p.info.name,

                // 后端给的
                cash: p.cash,
                hand: p.hand,

                // 前端已有状态（继承）
                totalCards: prev?.totalCards ?? 0,
                suitDeltas: prev?.suitDeltas ?? [0, 0, 0, 0],
                color: prev?.color ?? "#999",
              };
            });
          });
        }
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    };

    ws.onerror = (err) => {
      console.error("WS error", err);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [room_id, player_id]);

  const handleRoundEnd = async () => {
    const action: Action = {
      type: "EndRound",
      payload: {
        round_id: round,
        room_id: room_id,
      },
    };
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify(action));
      setSuitPrices({
        Spade: { seller: "", ask: 0, buyer: "", bid: 0 },
        Club: { seller: "", ask: 0, buyer: "", bid: 0 },
        Diamond: { seller: "", ask: 0, buyer: "", bid: 0 },
        Heart: { seller: "", ask: 0, buyer: "", bid: 0 },
      });
      setShowRoundEndDialog(true);
    }
  };

  const handleNextRound = async () => {
    const action: Action = {
      type: "StartRound",
      payload: {
        round_id: round + 1,
        room_id: room_id,
      },
    };
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify(action));
      setShowRoundEndDialog(false);
      setStartTimeStamp(() => Math.floor(Date.now() / 1000));
      setPlayerStates((prev) =>
        prev.map((p) => ({
          ...p,
          totalCards: playersCount === 4 ? 10 : 8,
          suitDeltas: [0, 0, 0, 0],
          // cash 不动，自动保留
        }))
      );
      setTradeHistory([]);
    }
  };

  const handleEndGameClick = () => {
    setShowEndDialog(true);
  };

  const handleCancelEndGame = () => {
    setShowEndDialog(false);
  };

  const handleConfirmEndGame = async () => {
    const action: Action = {
      type: "EndGame",
      payload: {
        room_id: room_id,
        round_id: round,
        player_id: selfState.id,
      },
    };
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify(action));
      setShowEndDialog(false);
      navigate("/");
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <CountdownBox
          startTimestamp={startTimestamp}
          endRound={handleRoundEnd}
        />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600 }}>{payload.room_name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 700 }}>第 {round} 回合</div>
          <button
            className="endIconButton"
            onClick={handleEndGameClick}
            title="结束本局"
            aria-label="结束本局"
          >
            ⏹
          </button>
        </div>
      </header>

      <main className="main">
        {/* Left */}
        <section className="left">
          {/* 当前玩家（CardHoarder 区域） */}
          <div
            className="card selfCard"
            style={{
              background: selfState.color,
              color: "white",
            }}
          >
            {/* 左侧：玩家名 + 头像 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                flex: 0.5,
                margin: "0 15px",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  textAlign: "center",
                  display: "block",
                }}
              >
                {payload.players[0]?.name}
              </span>
            </div>

            {/* 右侧：四个花色列 + 筹码价值列 */}
            <div
              style={{
                flex: 3.5,
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 20,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              {selfSuitLines.map(({ suit, label, current, delta }) => (
                <div
                  key={suit}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "#f6f7fa",
                    borderRadius: 8,
                    padding: "8px 6px",
                    minHeight: 50,
                    minWidth: 0,
                  }}
                >
                  {/* 上方花色 */}
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      marginBottom: 0,
                      color:
                        suit === "Spade" || suit === "Club"
                          ? "#000000"
                          : "#e53935",
                      textShadow: "0 1px 4px #dde1f5",
                    }}
                  >
                    {label}
                  </span>
                  {/* 下方: current 与 delta 列 */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* current 数量 */}
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#232b47",
                        lineHeight: 1.1,
                      }}
                    >
                      {current}
                    </span>
                    {/* delta */}
                    <span
                      style={{
                        fontSize: 12,
                        marginTop: 1,
                        fontWeight: 600,
                        color:
                          delta > 0
                            ? "#30b267"
                            : delta < 0
                            ? "#e53935"
                            : "#9aa2c7",
                        lineHeight: 1.1,
                        letterSpacing: 0.5,
                      }}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                </div>
              ))}

              {/* 筹码价值列 */}
              <div
                className="chipValue"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 6px",
                  borderRadius: 8,
                  minHeight: 50,
                }}
              >
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: 18,
                    color: "#ffffff",
                    lineHeight: 1.1,
                    textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                >
                  ¥{selfState.cash}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: "#ffffff",
                    marginTop: 2,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {selfState.totalCards} 张
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                playerStates.length - 1 === 4
                  ? "repeat(2, 1fr)"
                  : `repeat(${playerStates.length - 1}, 1fr)`,
              gap: 10,
              marginBottom: 12,
            }}
          >
            {playerStates.slice(1).map((p) => (
              <div
                key={p.id}
                className="card playerCard"
                style={{
                  background: p.color,
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
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {p.name}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#4a5568",
                    }}
                  >
                    <div>¥{p.cash}</div>
                    <div>{p.totalCards} 张</div>
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
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color:
                              suit === "Spade" || suit === "Club"
                                ? "#000000"
                                : "#e53935",
                          }}
                        >
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
                className="row tradeRow"
                style={{
                  background: "#ffffff",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                }}
              >
                {/* 左侧买入信息 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
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
                      justifyContent: "center", // 水平居中
                      flex: 1,
                      width: "100%",
                    }}
                  >
                    {priceLine.buyer ? (
                      <span
                        style={{
                          fontSize: 13,
                          color: "#1f2a44",
                          padding: "3px",
                          borderRadius: "4px",
                          background: getPlayerColor(
                            getPlayerIdByName(priceLine.buyer)
                          ),
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 800 }}>
                          ¥{priceLine.bid}
                        </span>{" "}
                        <button
                          className="priceAdjustButton"
                          onClick={() =>
                            placeQuote(suit, "Bid", priceLine.bid + 1)
                          }
                        >
                          ▲
                        </button>{" "}
                        <strong>{priceLine.buyer}</strong>买价{" "}
                        <button
                          style={{
                            padding: "6px 8px",
                            borderRadius: 999,
                            border: "none",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.35)",
                          }}
                          onClick={() =>
                            placeQuote(suit, "Offer", priceLine.bid)
                          }
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
                    <span>你买价</span>
                    <input
                      type="number"
                      defaultValue={0}
                      className="priceInput"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          // 之后可在这里接入实际更新逻辑
                          // e.currentTarget.blur();
                          const input = e.currentTarget;
                          const value = Number(input.value);
                          placeQuote(suit, "Bid", value);
                          input.value = "0"; // 置回 0
                          input.blur();
                        }
                      }}
                    />
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
                      background:
                        suit === "Spade" || suit === "Club"
                          ? "#000000"
                          : "#e53935",
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
                      <span
                        style={{
                          fontSize: 13,
                          color: "#1f2a44",
                          padding: "3px",
                          borderRadius: "4px",
                          background: getPlayerColor(
                            getPlayerIdByName(priceLine.seller)
                          ),
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 800 }}>
                          ¥{priceLine.ask}
                        </span>{" "}
                        <button
                          className="priceAdjustButton"
                          onClick={() =>
                            placeQuote(suit, "Offer", priceLine.ask - 1)
                          }
                        >
                          ▼
                        </button>{" "}
                        <strong>{priceLine.seller}</strong>卖价{" "}
                        <button
                          style={{
                            padding: "6px 8px",
                            borderRadius: 999,
                            border: "none",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.35)",
                          }}
                          onClick={() => placeQuote(suit, "Bid", priceLine.ask)}
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
                    <span>你卖价</span>
                    <input
                      type="number"
                      defaultValue={0}
                      className="priceInput"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          // 之后可在这里接入实际更新逻辑
                          const input = e.currentTarget;
                          const value = Number(input.value);
                          placeQuote(suit, "Offer", value);
                          input.value = "0"; // 置回 0
                          input.blur();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Right */}
        <aside className="right">
          <h3 style={{ textAlign: "center" }}>交易历史</h3>
          <table style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th>买家</th>
                <th>花色</th>
                <th>卖家</th>
                <th>价格</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.map((trade, i) => (
                <tr key={i} style={{ textAlign: "center" }}>
                  <td>{trade.buyer}</td>
                  <td
                    style={{
                      color:
                        trade.suit === "Heart" || trade.suit === "Diamond"
                          ? "#c00"
                          : "#000",
                    }}
                  >
                    {suitToSymbol(trade.suit)}
                  </td>
                  <td>{trade.seller}</td>
                  <td>¥{trade.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </main>

      {showEndDialog && (
        <div className="dialogBackdrop">
          <div className="dialogCard">
            <div className="dialogTitle">结束本局游戏？</div>
            <div className="dialogText">
              当前房间 <strong>{payload.roomName}</strong> · 第 {round} 回合
              <br />
              结束后将返回主页，无法继续本局。
            </div>
            <div className="dialogActions">
              <button
                type="button"
                className="dialogSecondaryButton"
                onClick={handleCancelEndGame}
              >
                继续游戏
              </button>
              <button
                type="button"
                className="dialogPrimaryButton"
                onClick={handleConfirmEndGame}
              >
                结束本局
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoundEndDialog && (
        <div className="dialogBackdrop">
          <div className="roundDialogCard">
            {/* Title */}
            <div
              style={{
                textAlign: "center",
                fontSize: 24,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              回合结束
            </div>
            {/* Goal Suit */}
            <div
              style={{
                textAlign: "center",
                fontSize: 16,
                marginBottom: 12,
              }}
            >
              目标花色：
              <span
                style={{
                  color: goalSuit === "♥" || goalSuit === "♦" ? "#c00" : "#000",
                }}
              >
                {goalSuit}
              </span>
            </div>

            {/* Ranking List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {roundEndedPlayerStates.map((p, index) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: p.color,
                    borderRadius: 10,
                    padding: 8,
                  }}
                >
                  {/* Rank */}
                  <div
                    style={{
                      width: 24,
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: 20,
                      marginRight: 12,
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    {/* Top row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      <span>{p.name}</span>
                      <span>¥{p.cash}</span>
                    </div>

                    {/* Bottom row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                      }}
                    >
                      <span>
                        ♠ {p.hand.Spade} ({p.suitDeltas[0]})
                      </span>
                      <span>
                        ♣ {p.hand.Club} ({p.suitDeltas[1]})
                      </span>
                      <span>
                        <span style={{ color: "#c00" }}>♦ </span>
                        {p.hand.Diamond} ({p.suitDeltas[2]})
                      </span>
                      <span>
                        <span style={{ color: "#c00" }}>♥ </span>
                        {p.hand.Heart} ({p.suitDeltas[3]})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 30,
                marginTop: 16,
              }}
            >
              <button
                style={{
                  padding: "12px 20px",
                  borderRadius: 16,
                  border: "none",
                  background: "#4caf93",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 16,
                }}
                onClick={handleNextRound}
              >
                下一回合
              </button>

              <button
                style={{
                  padding: "12px 20px",
                  borderRadius: 16,
                  border: "none",
                  background: "#e53935",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 16,
                }}
                onClick={handleConfirmEndGame}
              >
                结束游戏
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
