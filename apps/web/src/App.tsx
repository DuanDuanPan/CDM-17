import './style.css';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="section">
    <div className="section-title">{title}</div>
    <div className="section-body">{children}</div>
  </div>
);

function App() {
  return (
    <div className="shell">
      <header className="topbar">CDM 工作台 · 框架壳</header>
      <div className="layout">
        <aside className="sidebar">左侧导航/资源树</aside>
        <main className="canvas">
          <Section title="画布">
            支持脑图 / 甘特 / 时间轴 / 看板的占位。未来接入协同与快捷命令。
          </Section>
        </main>
        <aside className="inspector">
          <Section title="右侧面板">属性 / 访问记录 / 模板 / AI 建议</Section>
          <Section title="通知抽屉">通知与审计快捷入口</Section>
        </aside>
      </div>
    </div>
  );
}

export default App;
