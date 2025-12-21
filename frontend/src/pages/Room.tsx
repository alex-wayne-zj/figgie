import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Player } from "../types/player";
import robotAvatar from "../assets/robot.svg";
import {
  defaultRoomName,
  defaultRoomID,
  currentPlayer,
} from "../constants/dev";

// 纯函数，不适合放在内部（会增加渲染开销），建议放在外部
const randomRobot = (i: number): Player => ({
  id: `robot_${i + 1}`,
  name: `机器人${i + 1}`,
  avatar: robotAvatar,
});

const Room: React.FC = () => {
  // state 定义
  const [roomName, setRoomName] = useState(defaultRoomName);
  const [roomId] = useState(defaultRoomID);
  // 这里的 players 只包含机器人，不包含玩家自己
  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const navigate = useNavigate();

  // 依赖 state 的 const
  const robotsNum = players.length;
  // 至少需要需要 3 个机器人才能开始游戏
  const canStart = robotsNum >= 3 && isReady;

  // 常量定义
  // 四个座位，全部空位可加机器人
  const NUM_SLOTS = 4;

  // handler 函数定义
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const handleAddRobot = () => {
    if (players.length < NUM_SLOTS) {
      setPlayers([...players, randomRobot(players.length)]);
    }
  };

  const handleRemoveRobot = () => {
    const idx = players.length - 1;
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const handleToggleReady = () => {
    setIsReady((r) => !r);
  };

  // handleStartGame: 向后端 /api/start 接口发 POST 请求
  const handleStartGame = async () => {
    if (!canStart) return;
    setStartLoading(true);
    setStartError(null);

    const payload = {
      room_name: roomName,
      room_id: roomId,
      players: [
        { name: currentPlayer.name, id: currentPlayer.id },
        ...players.map((p) => ({ name: p.name, id: p.id })),
      ],
    };
    try {
      console.log(payload);
      const resp = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(resp);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      navigate("/game", {
        state: {
          payload,
        },
      });
    } catch (e: any) {
      setStartError("网络异常，游戏无法启动");
      setStartLoading(false);
    }
  };

  return (
    <section
      style={{
        padding: "24px 24px",
        width: "80vw",
        maxWidth: 960,
        minWidth: 400,
        margin: "0 auto",
        height: "90vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-evenly",
      }}
    >
      {/* 房间名和ID */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          style={{
            fontSize: "2rem",
            fontWeight: 600,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "#24385b",
            padding: "2px 6px",
            borderBottom: "1.5px solid #d6e4fa",
            flex: 1,
            minWidth: 0,
          }}
          maxLength={24}
        />
      </div>
      {/* 房间ID与复制 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontWeight: 500,
            fontSize: "1rem",
            color: "#84a2c7",
            marginLeft: 10,
          }}
        >
          房间 ID：
        </span>
        <span
          style={{
            padding: "3px 8px",
            background: "#f4f8fc",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: "1.05em",
            letterSpacing: 1.4,
            color: "#456",
          }}
        >
          {roomId}
        </span>
        <button
          onClick={handleCopy}
          style={{
            marginLeft: 6,
            border: "none",
            background: "#e3f0fd",
            color: "#386be6",
            padding: "3px 12px",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "1em",
          }}
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      {/* 自己的头像 —— 独立于座位展示在上方 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <img
          src={currentPlayer.avatar}
          alt="你的头像"
          width={56}
          height={56}
          style={{
            borderRadius: "50%",
            border: "2px solid #a2b5fb",
            background: "#ecf2fa",
            marginBottom: 6,
          }}
        />
        <div
          style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "#1e3150",
            letterSpacing: 0.4,
          }}
        >
          {currentPlayer.name}
        </div>
      </div>
      {/* 四个座位：你不占座位，只展示机器人或空位，无添加按钮 */}
      <div
        style={{
          display: "flex",
          gap: 34,
          justifyContent: "center",
          width: "100%",
          minHeight: 100,
        }}
      >
        {Array.from({ length: NUM_SLOTS }).map((_, idx) => {
          const person = players[idx];
          if (person) {
            // 机器人
            return (
              <div
                key={person.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 65,
                  flex: 1,
                }}
              >
                <img
                  src={person.avatar}
                  alt={person.name}
                  width={62}
                  height={62}
                  style={{
                    borderRadius: "50%",
                    border: "2px solid #bdd9fa",
                    filter: "grayscale(26%)",
                  }}
                />
                <span
                  style={{
                    fontSize: 16,
                    color: "#858bb2",
                  }}
                >
                  {person.name}
                </span>
              </div>
            );
          } else {
            // 空位
            return (
              <div
                key={`slot-empty-${idx}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 13,
                  minWidth: 65,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: "50%",
                    background: "#eaf2fd",
                    border: "2px dashed #bdd9fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#b6c9e3",
                    fontSize: 36,
                    marginBottom: 2,
                  }}
                >
                  ?
                </div>
              </div>
            );
          }
        })}
      </div>
      {/* 机器人操作（添加/移除）按钮，统一放在准备按钮上方，左右并排 */}
      <div
        style={{
          display: "flex",
          gap: 20,
          justifyContent: "center",
        }}
      >
        <button
          onClick={handleAddRobot}
          style={{
            background: players.length < NUM_SLOTS ? "#e2f3ea" : "#efefef",
            color: players.length < NUM_SLOTS ? "#33b282" : "#b1babd",
            border: "none",
            borderRadius: "18px",
            padding: "7px 30px",
            cursor: players.length < NUM_SLOTS ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: 15,
            boxShadow:
              players.length < NUM_SLOTS
                ? "0 2px 9px 0 rgba(51,180,130,0.09)"
                : undefined,
            opacity: players.length < NUM_SLOTS ? 1 : 0.7,
            transition: "background 0.12s",
          }}
          tabIndex={0}
          disabled={players.length >= NUM_SLOTS}
        >
          添加机器人
        </button>
        <button
          onClick={handleRemoveRobot}
          style={{
            background: players.length > 0 ? "#f8eaea" : "#f4f4f4",
            color: players.length > 0 ? "#ea4866" : "#c0bbc8",
            border: "none",
            borderRadius: "18px",
            padding: "7px 30px",
            cursor: players.length > 0 ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: 15,
            boxShadow:
              players.length > 0
                ? "0 2px 9px 0 rgba(234,72,102,0.09)"
                : undefined,
            opacity: players.length > 0 ? 1 : 0.7,
            transition: "background 0.12s",
          }}
          disabled={players.length === 0}
        >
          移除机器人
        </button>
      </div>
      {/* 准备按钮，可切换状态 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 0,
          position: "relative",
        }}
      >
        {/* 准备按钮 - 居中 */}
        <button
          onClick={handleToggleReady}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "9px 46px", // 微调让高度更接近大按钮
            border: "none",
            borderRadius: "20px",
            background: isReady ? "#c0edd4" : "#d5e2fa",
            color: isReady ? "#33b282" : "#5b7ccf",
            fontWeight: 700,
            fontSize: "1.05rem",
            cursor: "pointer",
            opacity: 1,
            transition: "background 0.12s,color 0.12s",
            height: "40px",
            lineHeight: "normal",
            boxShadow: isReady
              ? "0 2px 10px 0 rgba(51,180,130,0.08)"
              : undefined,
            minWidth: 110,
            zIndex: 1,
          }}
        >
          {isReady ? "已准备" : "准备"}
        </button>
      </div>
      {/* 开始游戏按钮 - 右侧放大醒目 */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleStartGame}
          disabled={!canStart || startLoading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            borderRadius: "26px",
            background: canStart
              ? "linear-gradient(90deg,#48ec8d 0%, #06b45e 100%)"
              : "#f3f4f7",
            color: canStart ? "#fff" : "#bcc9c5",
            fontWeight: canStart ? 900 : 600,
            fontSize: canStart ? "1.27rem" : "1.08rem",
            letterSpacing: canStart ? 3 : 1,
            cursor: canStart && !startLoading ? "pointer" : "not-allowed",
            boxShadow: canStart
              ? "0 6px 26px 0 rgba(51,180,130,0.22),0 0.5px 2.5px 0 rgba(0,0,0,0.04)"
              : undefined,
            borderStyle: canStart ? "none" : "dashed",
            borderColor: canStart ? "transparent" : "#e1e7ef",
            filter: canStart
              ? "none"
              : "blur(0px) grayscale(30%) brightness(0.98)",
            transition: "all 0.23s cubic-bezier(.83,0,.17,1.02)",
            opacity: startLoading ? 0.6 : canStart ? 1 : 0.52,
            height: "47px",
            lineHeight: "normal",
            minWidth: 150,
          }}
        >
          {startLoading ? "正在开始..." : "开始游戏"}
        </button>
      </div>
      {/* 游戏规则提醒 */}
      <div
        style={{
          color: "#8bb",
          fontSize: 15,
          textAlign: "center",
          marginTop: 10,
        }}
      >
        需要 4-5 位玩家才能开始游戏。
      </div>
      {/* 错误提示 */}
      <div style={{ minHeight: 25 }}>
        <div
          style={{
            color: "#dc6777",
            textAlign: "center",
            fontSize: 15,
          }}
        >
          {startError}
        </div>
      </div>
    </section>
  );
};

export default Room;
