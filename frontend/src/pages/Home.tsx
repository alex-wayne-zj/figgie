import React from 'react';

const Home: React.FC = () => {
  return (
    <div style={{
      width: "100%",
      minHeight: "90vh",
      background: "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: 0,
      margin: 0,
      position: "relative",
      boxSizing: "border-box",
    }}>
      {/* 标题 */}
      <h1 style={{
        fontSize: "2.6rem",
        marginTop: 120,
        marginBottom: "20vh",
        fontWeight: "700",
        color: "#284179"
      }}>Figgie Game</h1>
      {/* 创建房间按钮 */}
      <a
        href="/room"
        style={{
          padding: "18px 42px",
          background: "linear-gradient(90deg, #71b7fa 0%, #6a93ec 100%)",
          border: "none",
          color: "#fff",
          borderRadius: "36px",
          fontSize: "1.25rem",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 2px 12px 0 rgba(38,65,121,0.09)",
          transition: "box-shadow 0.2s",
          display: "inline-block",
          textDecoration: "none",
          textAlign: "center",
        }}
        onMouseOver={e => (e.currentTarget.style.boxShadow = "0 4px 18px 0 rgba(38,65,121,0.13)")}
        onMouseOut={e => (e.currentTarget.style.boxShadow = "0 2px 12px 0 rgba(38,65,121,0.09)")}
      >
        创建房间
      </a>
      {/* 其它功能拓展占位符 */}
      <div style={{
        position: "absolute",
        bottom: 32,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center"
      }}>
        {/* 这里可以放置友情链接、功能入口等内容 */}
        <span style={{
          background: "rgba(255,255,255,0.6)",
          borderRadius: "12px",
          padding: "8px 22px",
          color: "#678",
          fontSize: "1rem",
        }}>
          Trading in the Virtual Markets
        </span>
      </div>
    </div>
  );
};

export default Home;
