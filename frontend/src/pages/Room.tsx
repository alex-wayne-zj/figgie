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
  id: `robot${i+1}`,
  name: `机器人${i+1}`,
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

  const canStart = allRobotCount >= 3 && isReady; // Only allow if 3 or 4 bots

  // 新 handleStartGame: 向 /api/start 发 POST 请求
  const handleStartGame = async () => {
    if (!canStart) return;
    setStartLoading(true);
    setStartError(null);

    // 构造请求数据
    const payload = {
      room_name: roomName,
      room_id: roomId,
      players: [
        { name: myUser.name, id: myUser.id },
        ...players.map(p => ({ name: p.name, id: p.id }))
      ]
    };
    try {
      const resp = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(payload)
      console.log(resp)
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      console.log(JSON.stringify(payload))
      // 可根据 resp 处理返回内容。假定跳转即可
      navigate("/game", {
        state: {
          payload,
        },
      });
    } catch (e: any) {
      setStartError('网络异常，游戏无法启动');
      setStartLoading(false);
    }
  };

  const handleToggleReady = () => {
    setIsReady(r => !r);
  };

  return (
    <section
      style={{
        padding: '24px 24px',
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
        <span style={{fontWeight: 500, fontSize: "1rem", color: "#84a2c7", marginLeft: 10}}>
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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
        textAlign: 'center',
      }}>
        <img 
          src={myUser.avatar} 
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
        <div style={{
          fontWeight: 700, 
          fontSize: "1.1rem", 
          color: "#1e3150", 
          letterSpacing: 0.4
        }}>
          {myUser.name}
        </div>
      </div>
      {/* 四个座位：你不占座位，只展示机器人或空位，无添加按钮 */}
      <div style={{
        display: "flex",
        gap: 34,
        marginBottom: 20,
        justifyContent: "center",
        width: "100%",
        minHeight: 100
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
              </div>
            );
          } else {
            // 空位
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
          marginBottom: 18
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
            boxShadow: players.length < NUM_SLOTS ? "0 2px 9px 0 rgba(51,180,130,0.09)" : undefined,
            opacity: players.length < NUM_SLOTS ? 1 : 0.7,
            transition: "background 0.12s"
          }}
          tabIndex={0}
          disabled={players.length >= NUM_SLOTS}
        >添加机器人</button>
        <button
          onClick={() => handleRemoveRobot(players.length - 1)}
          style={{
            background: players.length > 0 ? "#f8eaea" : "#f4f4f4",
            color: players.length > 0 ? "#ea4866" : "#c0bbc8",
            border: "none",
            borderRadius: "18px",
            padding: "7px 30px",
            cursor: players.length > 0 ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: 15,
            boxShadow: players.length > 0 ? "0 2px 9px 0 rgba(234,72,102,0.09)" : undefined,
            opacity: players.length > 0 ? 1 : 0.7,
            transition: "background 0.12s"
          }}
          disabled={players.length === 0}
        >移除机器人</button>
      </div>
      {/* 准备按钮，可切换状态 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
          gap: 0,
          position: "relative"
        }}
      >
        {/* 占左侧空间，使准备按钮居中 */}
        <div style={{ flex: 1 }}></div>
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
            boxShadow: isReady ? "0 2px 10px 0 rgba(51,180,130,0.08)" : undefined,
            minWidth: 110,
            zIndex: 1
          }}
        >
          {isReady ? '已准备' : '准备'}
        </button>
        {/* 开始游戏按钮 - 右侧放大醒目 */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end"}}>
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
              filter: canStart ? "none" : "blur(0px) grayscale(30%) brightness(0.98)",
              transition: "all 0.23s cubic-bezier(.83,0,.17,1.02)",
              opacity: startLoading ? 0.6 : (canStart ? 1 : 0.52),
              height: "47px",
              lineHeight: "normal",
              minWidth: 150,
              marginLeft: 34 // 让分隔更明显
            }}
          >
            {startLoading ? '正在开始...' : '开始游戏'}
          </button>
        </div>
      </div>
      {/* 游戏规则提醒 */}
      <div style={{
        color: "#8bb",
        fontSize: 15,
        textAlign: "center",
        marginTop: 10
      }}>
        需要 4-5 位玩家才能开始游戏。
      </div>
      {/* 错误提示 */}
      {startError && (
        <div style={{ color: "#dc6777", textAlign: "center", fontSize: 15, marginTop: 8 }}>
          {startError}
        </div>
      )}
    </section>
  );
};

export default Room;
