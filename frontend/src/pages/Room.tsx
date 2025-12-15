import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const defaultRoomId = 'R123-456-ABCD';

type Player = {
  id: string;
  name: string;
  avatar: string;
  isSelf: boolean;
};

const randomRobot = (i: number): Player => ({
  id: `robot${i}`,
  name: `机器人${i}`,
  avatar: 'https://img.icons8.com/ios/50/robot-2.png',
  isSelf: false
});

const myUser: Player = {
  id: 'user_001',
  name: '你',
  avatar: 'https://img.icons8.com/arcade/64/user-male.png',
  isSelf: true
};

const Room: React.FC = () => {
  const [roomName, setRoomName] = useState("我的房间");
  const [roomId] = useState(defaultRoomId);
  // players 只包含机器人，不包含自己
  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false); // 新增准备状态
  const [startLoading, setStartLoading] = useState(false); // loading 开始游戏
  const [startError, setStartError] = useState<string | null>(null);

  const navigate = useNavigate();

  // 四个座位，全部空位可加机器人，不包含自己
  const NUM_SLOTS = 4;

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
      setPlayers([
        ...players,
        randomRobot(players.length)
      ]);
    }
  };

  const handleRemoveRobot = (idx: number) => {
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const allRobotCount = players.length;

  const canStart = allRobotCount >= 3; // Only allow if 3 or 4 bots

  // 新 handleStartGame: 向 /api/start 发 POST 请求
  const handleStartGame = async () => {
    if (!canStart) return;
    setStartLoading(true);
    setStartError(null);

    // 构造请求数据
    const payload = {
      roomName,
      roomId,
      players: [
        { name: myUser.name, id: myUser.id },
        ...players.map(p => ({ name: p.name, id: p.id }))
      ],
      robotCount: allRobotCount
    };
    try {
      const resp = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(resp)
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      // 可根据 resp 处理返回内容。假定跳转即可
      navigate("/game");
    } catch (e: any) {
      setStartError('网络异常，游戏无法启动');
      setStartLoading(false);
    }
  };

  const handleToggleReady = () => {
    setIsReady(r => !r);
  };

  // 修改：使整体宽度达到80%
  return (
    <section
      style={{
        padding: '48px 24px',
        width: '80vw',
        maxWidth: 960,
        minWidth: 400,
        margin: '0 auto'
      }}
    >
      {/* 房间名和ID */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        marginBottom: 16
      }}>
        <input
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
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
            minWidth: 0
          }}
          maxLength={24}
        />
      </div>
      {/* 房间ID与复制 */}
      <div style={{ display: 'flex', alignItems: "center", marginBottom: 28, gap: 10 }}>
        <span style={{fontWeight: 500, fontSize: "1rem", color: "#84a2c7"}}>
          房间 ID：
        </span>
        <span style={{
          padding: "3px 8px",
          background: "#f4f8fc",
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: "1.05em",
          letterSpacing: 1.4,
          color: "#456"
        }}>{roomId}</span>
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
            fontSize: "1em"
          }}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {/* 自己的头像 —— 独立于座位展示在上方 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        marginBottom: 30,
        gap: 14
      }}>
        <img src={myUser.avatar} alt="你的头像" width={56} height={56} style={{
          borderRadius: "50%",
          border: "2px solid #a2b5fb",
          background: "#ecf2fa"
        }} />
        <div style={{
          fontWeight: 700, fontSize: "1.1rem", color: "#1e3150", letterSpacing: 0.4
        }}>{myUser.name} (ID: {myUser.id})</div>
      </div>
      {/* 四个座位：你不占座位，全部为机器人/空位 */}
      <div style={{
        display: "flex",
        gap: 34,
        marginBottom: 35,
        justifyContent: "center",
        width: "100%",
        minHeight: 135
      }}>
        {Array.from({ length: NUM_SLOTS }).map((_, idx) => {
          const person = players[idx];
          if (person) {
            // 机器人
            return (
              <div
                key={person.id}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 10, minWidth: 65, flex: 1
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
                    filter: "grayscale(26%)"
                  }}
                />
                <span style={{
                  fontSize: 16, color: "#858bb2"
                }}>{person.name}</span>
                <button
                  onClick={() => handleRemoveRobot(idx)}
                  style={{
                    marginTop: 2,
                    background: "#f8eaea",
                    border: "none",
                    color: "#ea4866",
                    borderRadius: "6px",
                    padding: "0px 12px",
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                >移除</button>
              </div>
            );
          } else {
            // 空位，可添加机器人
            return (
              <div
                key={`slot-empty-${idx}`}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 13, minWidth: 65, flex: 1
                }}
              >
                <div style={{
                  width: 62, height: 62, borderRadius: "50%",
                  background: "#eaf2fd",
                  border: "2px dashed #bdd9fa",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#b6c9e3",
                  fontSize: 36,
                  marginBottom: 2
                }}>?</div>
                <button
                  onClick={handleAddRobot}
                  style={{
                    background: "#e2f3ea",
                    color: "#33b282",
                    border: "none",
                    borderRadius: "18px",
                    padding: "3px 20px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14
                  }}
                  tabIndex={0}
                >添加机器人</button>
              </div>
            );
          }
        })}
      </div>
      {/* 准备按钮，可切换状态 */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: 20
      }}>
        <button
          onClick={handleToggleReady}
          style={{
            padding: "14px 80px",
            border: "none",
            borderRadius: "28px",
            background: isReady ? "#c0edd4" : "#d5e2fa",
            color: isReady ? "#33b282" : "#5b7ccf",
            fontWeight: 700,
            fontSize: "1.16rem",
            cursor: "pointer",
            opacity: 1,
            transition: "background 0.12s,color 0.12s"
          }}
        >{isReady ? '已准备' : '准备'}</button>
      </div>
      {/* 开始游戏 */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleStartGame}
          disabled={!canStart || startLoading}
          style={{
            padding: "16px 80px",
            border: "none",
            borderRadius: "28px",
            background: canStart ? "linear-gradient(90deg, #59daae 0%, #2fcd71 100%)" : "#e1f3e0",
            color: canStart ? "#fff" : "#77b289",
            fontWeight: 800,
            fontSize: "1.22rem",
            letterSpacing: 1.2,
            cursor: canStart && !startLoading ? "pointer" : "not-allowed",
            boxShadow: canStart ? "0 2px 14px 0 rgba(51,180,130,0.11)" : undefined,
            transition: "background 0.2s",
            opacity: startLoading ? 0.6 : 1
          }}
        >{startLoading ? '正在开始...' : '开始游戏'}</button>
      </div>
      {/* 错误提示 */}
      {startError && (
        <div style={{ color: "#dc6777", textAlign: "center", marginTop: 12, fontSize: 15 }}>
          {startError}
        </div>
      )}
      {/* 游戏规则提醒 */}
      <div style={{
        color: "#8bb",
        fontSize: 15,
        textAlign: "center",
        marginTop: 24
      }}>
        至少加入3名机器人才能开始游戏。
      </div>
    </section>
  );
};

export default Room;
