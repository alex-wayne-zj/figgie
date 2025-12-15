import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";


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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "88vh",
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
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  button: {
    padding: "4px 8px",
    marginLeft: 4,
    cursor: "pointer",
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

  const { state } = useLocation();
  const payload = state?.payload;

  if (!payload) {
    return <div>非法进入 game 页面</div>;
  }
  // console.log(payload)

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <CountdownBox startTimestamp={startTimestamp} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600 }}>{ payload.roomName }</div>
        </div>
        <div style={{ fontWeight: 700 }}>Round 1</div>
      </header>

      <main style={styles.main}>
        {/* Left */}
        <section style={styles.left}>
          <div
            style={{
              ...styles.card,
              background: "#4f79d9",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span>CardHoarder</span>
            <span>$292</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["Trader Joseph", "Bot-Panther", "Bot-Wallaby", "Bot-Porcupine"].map(
              (name) => (
                <div key={name} style={{ ...styles.card, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{name}</div>
                  <div style={{ fontSize: 12 }}>♠ +1</div>
                  <div style={{ fontSize: 12 }}>♣ -1</div>
                  <div style={{ fontSize: 12 }}>♦ -2</div>
                  <div style={{ fontSize: 12 }}>♥ +2</div>
                </div>
              )
            )}
          </div>

          {SUITS.map(({ suit, label, color }) => (
            <div key={suit} style={{ ...styles.row, background: color }}>
              <div>
                <strong>{label}</strong>
                <button style={styles.button}>SELL</button>
                <button style={styles.button}>BID</button>
              </div>
              <div>
                <span>Bid 5</span> · <span>Ask 12</span>
              </div>
              <button style={styles.button}>BUY</button>
            </div>
          ))}
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
    </div>
  );
}
