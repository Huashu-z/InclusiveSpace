import React, { useState } from "react";
import sty from "./Sidebar.module.css";
import { getDemoScenariosList, getDemoScenario } from "../utils/demoScenarios.js";

export default function AgentPanel({
  selectedCity = "hamburg",
  selectedLayers = [],
  agentProfile,
  startPoint,
  setStartPoints,
  onApplySettings,
  onLoadScenario,
  onResponse,
}) {
  const [prompt, setPrompt] = useState("我是一位老年人，想知道这个区域是否适合步行/活动？");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    await sendRequest(prompt);
  };

  async function sendRequest(overridePrompt) {
    const p = typeof overridePrompt === "string" ? overridePrompt : prompt;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          profile: agentProfile,
          selectedCity,
          layerIds: selectedLayers,
          startPoint,
          mode: "analysis"
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Agent API 请求失败");
      }
      const data = await response.json();
      setResult(data);
      onResponse?.(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "未知错误");
    } finally {
      setLoading(false);
    }
  }

  const handleApply = () => {
    if (!result?.suggestedSettings) return;
    onApplySettings?.(result.suggestedSettings);
  };

  const handleApplyAndRun = () => {
    if (!result?.suggestedSettings) return;
    onApplySettings?.(result.suggestedSettings);
    handleRunRealComputation();
  };

  const handleSelectRegionAndRun = (region) => {
    // region.center assumed as [lon, lat]
    if (!region || !region.center) return;
    if (typeof setStartPoints === 'function') {
      try {
        setStartPoints((prev) => ([...(prev || []), region.center]));
      } catch (e) {
        // fallback: call with single-element array
        setStartPoints([region.center]);
      }
    }
    // apply suggested settings if present
    if (result?.suggestedSettings) onApplySettings?.(result.suggestedSettings);
    handleRunRealComputation();
  };

  const handleRunRealComputation = () => {
    alert(
      "⚠️ 真实计算模式（演示占位）\n\n" +
      "在此模式下，系统将：\n" +
      "1. 调用 pgRouting 生成基于路网的等时线（isochrone）\n" +
      "2. 在可达区域内统计所有环境要素\n" +
      "3. 生成更精确的可达性评分和因子分析\n\n" +
      "当前演示版仅提供启发式估计。完整版支持实时计算。"
    );
  };

  const handleLoadDemoScenario = (scenarioId) => {
    const scenario = getDemoScenario(scenarioId);
    if (!scenario) return;

    onLoadScenario?.(scenario);

    // 预填充问题
    setPrompt(scenario.question);
    setResult(null);
    setError(null);
    setShowDemoMenu(false);
    // 自动发送请求以便快速演示（如果希望仅预填，请取消下一行）
    void sendRequest(scenario.question);
  };

  return (
    <section className={sty.agentPanel} aria-label="AI 代理分析">
      <div className={sty.sidebarSectionTitle}>AI 可达性助手</div>
      
      {/* 演示场景快捷菜单 */}
      <div style={{ marginBottom: "12px" }}>
        <button 
          type="button"
          onClick={() => setShowDemoMenu(!showDemoMenu)}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold"
          }}
        >
          {showDemoMenu ? "▼ 隐藏演示场景" : "▶ 加载演示场景"}
        </button>
        
        {showDemoMenu && (
          <div style={{
            marginTop: "8px",
            padding: "8px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            border: "1px solid #ddd"
          }}>
            <div className={sty.sidebarText} style={{ fontSize: "12px", marginBottom: "8px", color: "#666" }}>
              💡 选择一个演示场景快速加载（会预填充问题和配置建议）：
            </div>
            {getDemoScenariosList().map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => handleLoadDemoScenario(scenario.id)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px",
                  marginBottom: "6px",
                  backgroundColor: "#fff",
                  border: "1px solid #bbb",
                  borderRadius: "3px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "12px"
                }}
              >
                <strong>{scenario.title}</strong>
                <br />
                <span style={{ color: "#666", fontSize: "11px" }}>
                  {scenario.description.substring(0, 60)}...
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={sty.sidebarText}>
        {agentProfile
          ? `当前画像：${agentProfile.label || agentProfile.id}`
          : "未选择画像，建议先在用户画像面板中选择一个预设。"}
      </div>
      <div className={sty.sidebarText}>
        {startPoint
          ? `当前起点：${startPoint[1].toFixed(6)}, ${startPoint[0].toFixed(6)}`
          : "请先在地图上选择起点，AI 分析会基于此起点的区域。"}
      </div>
      <form className={sty.agentForm} onSubmit={handleSubmit}>
        <textarea
          className={sty.agentInput}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          aria-label="AI 问题输入"
        />
        <button type="submit" className={sty.getCatchmentButton} disabled={loading}>
          {loading ? "分析中…" : "发送给 AI"}
        </button>
      </form>

      {error && <div className={sty.sidebarError}>{error}</div>}

      {result && (
        <div className={sty.agentResultBox}>
          <div className={sty.sidebarSubtitle}>AI 分析结果</div>

          {/* 人性化优先展示：结论 -> 简要依据 -> 详细说明 */}
          {(() => {
            const conclusionFromResult = result.conclusion || null;
            let conclusionText = '';
            if (conclusionFromResult) {
              conclusionText = conclusionFromResult;
            } else if (result.mode === 'region_recommendation') {
              const top = result.recommendedRegions && result.recommendedRegions[0];
              conclusionText = top ? `结论：优先推荐 ${top.name}（得分 ${top.score}/100）。` : '结论：未找到明显推荐区域。';
            } else if (typeof result.score === 'number') {
              conclusionText = result.score >= 60 ? `结论：基于当前数据，对该用户类型总体上是相对友好的（得分 ${result.score}/100）。` : `结论：基于当前数据，存在改进需求（得分 ${result.score}/100）。`;
            } else {
              conclusionText = '结论：未能基于当前数据得出明确结论。';
            }

            // 简要依据：优先使用 factors，回退到 references
            let evidenceText = '';
            if (Array.isArray(result.factors) && result.factors.length > 0) {
              const top = result.factors.slice(0, 3).map(f => {
                const short = f.value ? `${f.name}（${f.value}）` : f.name;
                return short;
              });
              evidenceText = `依据：主要发现包括 ${top.join('、')}。`;
            } else if (Array.isArray(result.references) && result.references.length > 0) {
              const refs = result.references.slice(0, 3).map(r => `${r.description}${r.count ? `（${r.count}）` : ''}`);
              evidenceText = `依据：参考了地图要素数据（例如 ${refs.join('、')}）。`;
            }

            return (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>{conclusionText}</div>
                {evidenceText && <div className={sty.sidebarText} style={{ fontSize: '13px', color: '#444' }}>{evidenceText}</div>}
                {/* 详细说明（可折叠/预览） */}
                {result.reply && (
                  <div className={sty.sidebarText} style={{ whiteSpace: 'pre-wrap', marginTop: '8px', color: '#666', fontSize: '12px' }}>
                    {result.reply}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 区域推荐模式 */}
          {result.mode === "region_recommendation" && (
            <div>
              <div className={sty.sidebarText} style={{ whiteSpace: "pre-wrap" }}>
                {result.reply}
              </div>
              {result.recommendedRegions && result.recommendedRegions.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <div className={sty.sidebarSubtitle}>推荐区域列表</div>
                  <ul className={sty.agentFactorList}>
                    {result.recommendedRegions.map((region, idx) => (
                      <li key={idx} className={sty.agentFactorItem}>
                        <strong>{region.name}</strong> (得分: {region.score}/100)
                        <br />
                        {region.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 点位查询模式 */}
          {(!result.mode || result.mode === "point_analysis") && (
            <div>
              <div className={sty.sidebarText}>{result.reply}</div>
              {typeof result.score === "number" && (
                <div className={sty.sidebarTextBold}>可达性得分：{result.score}/100</div>
              )}
              {Array.isArray(result.factors) && result.factors.length > 0 && (
                <div>
                  <div className={sty.sidebarSubtitle}>关键因素</div>
                  <ul className={sty.agentFactorList}>
                    {result.factors.map((factor, index) => (
                      <li key={index} className={sty.agentFactorItem}>
                        <strong>{factor.name}：</strong>
                        {factor.value}，{factor.explain || factor.impact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 推荐参数 */}
          {result.suggestedSettings && Object.keys(result.suggestedSettings).length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div className={sty.sidebarSubtitle}>推荐参数</div>
              <pre className={sty.agentSettingsPre}>
                {JSON.stringify(result.suggestedSettings, null, 2)}
              </pre>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className={sty.setupButton} onClick={handleApply}>
                  应用推荐参数
                </button>
                <button type="button" className={sty.setupButton} onClick={handleApplyAndRun} style={{ backgroundColor: '#1976d2', color: '#fff' }}>
                  应用并运行真实计算
                </button>
              </div>
            </div>
          )}

          {/* 运行真实计算按钮 */}
          {result.askRealComputation && result.mode === "point_analysis" && startPoint && (
            <div style={{ marginTop: "12px" }}>
              <button 
                type="button" 
                className={sty.setupButton}
                onClick={handleRunRealComputation}
                style={{ backgroundColor: "#4CAF50" }}
              >
                🔧 运行真实计算（基于路网）
              </button>
              <div className={sty.sidebarText} style={{ fontSize: "12px", marginTop: "8px", color: "#666" }}>
                ⚠️ 当前结果为启发式估计。点击此按钮将调用 pgRouting 进行精确的路网可达性计算。
              </div>
            </div>
          )}

          {/* 渲染 references（支持结论的参考资料） */}
          {result.references && result.references.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div className={sty.sidebarSubtitle}>参考资料</div>
              <ul className={sty.agentFactorList}>
                {result.references.map((ref, i) => (
                  <li key={i} className={sty.agentFactorItem}>
                    <strong>{ref.description}</strong>：{ref.count} 个
                    {ref.sampleHighlights && ref.sampleHighlights.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#666' }}>示例要素 id: {ref.sampleHighlights.join(', ')}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.ragResults && result.ragResults.length > 0 && (
            <div style={{ marginTop: '12px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
              <div className={sty.sidebarSubtitle}>RAG 检索结果</div>
              <div className={sty.sidebarText} style={{ fontSize: '12px', marginBottom: '8px' }}>
                以下是基于你的问题从本地索引检索到的相关图层摘要，帮助判断检索质量。
              </div>
              <ul className={sty.agentFactorList}>
                {result.ragResults.map((doc, idx) => (
                  <li key={doc.id || idx} className={sty.agentFactorItem}>
                    <strong>{idx + 1}. {doc.description}</strong>（score: {Number(doc.score).toFixed(3)}）
                    <div style={{ fontSize: '12px', color: '#444', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{doc.summary}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 区域推荐后的"选择起点"提示 */}
          {result.mode === "region_recommendation" && (
            <div style={{ marginTop: "12px", backgroundColor: "#f0f8ff", padding: "8px", borderRadius: "4px" }}>
              <div className={sty.sidebarSubtitle}>下一步</div>
              <div className={sty.sidebarText} style={{ fontSize: "13px" }}>
                在地图上选择推荐区域附近作为起点，或使用下列按钮将推荐区域设为起点并直接运行真实计算（演示占位）。
              </div>
              {result.recommendedRegions && result.recommendedRegions.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {result.recommendedRegions.map((region, idx) => (
                    <div key={region.id || idx} style={{ marginBottom: '8px', padding: '6px', background: '#fff', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                      <div style={{ fontWeight: '600' }}>{region.name} （得分 {region.score}/100）</div>
                      <div style={{ fontSize: '12px', color: '#444' }}>{region.description}</div>
                      <div style={{ marginTop: '6px' }}>
                        <button type="button" className={sty.setupButton} onClick={() => handleSelectRegionAndRun(region)}>
                          设为起点并运行真实计算
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
