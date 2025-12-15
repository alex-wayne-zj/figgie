import React from 'react';

const Game: React.FC = () => {
  return (
    <section style={{ padding: '48px 24px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: 12 }}>对局</h1>
      <p style={{ color: '#56657f', marginBottom: 24 }}>
        这里展示对局相关的内容（棋盘、玩家状态、计时等）。
        后续可在此集成交互逻辑与实时数据。
      </p>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 10px 38px rgba(15, 23, 42, 0.06)',
        border: '1px solid #e6ebf3'
      }}>
        对局区域占位
      </div>
    </section>
  );
};

export default Game;
