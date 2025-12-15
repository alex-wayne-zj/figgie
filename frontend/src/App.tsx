import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Room from './pages/Room';
import './App.css';

function App() {
  return (
    <div className="layout">
      <header className="topbar">
        <nav className="nav">
          <div className="nav-left">
            <span
              className="avatar"
              style={{
                background: "#60bcf7",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            ></span>
            <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit", gap: 10 }}>
              <span style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "1px" }}>Figgie</span>
            </Link>
          </div>
          <div className="nav-right">
            <Link to="/" className="nav-link">成就榜单</Link>
            <Link to="/" className="nav-link">历史对局</Link>
            <Link to="/" className="nav-link">如何游玩</Link>
            <Link to="/" className="nav-link">游戏设置</Link>
          </div>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room" element={<Room />} />
          <Route path="/game" element={<Game />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
