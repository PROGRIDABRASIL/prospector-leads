import { useState, useCallback } from "react";

const SEGMENT_PRESETS = [
  { label: "Advogados", query: "advogado escritório advocacia" },
  { label: "Imobiliárias", query: "imobiliária corretor de imóveis" },
  { label: "Contadores", query: "contador escritório contabilidade" },
  { label: "Médicos", query: "clínica médica consultório médico" },
  { label: "Dentistas", query: "dentista clínica odontológica" },
  { label: "Psicólogos", query: "psicólogo psicóloga clínica psicologia" },
  { label: "Coaches / Consultores", query: "coach consultor consultoria" },
  { label: "Personalizado", query: "" },
];

const STATUS = { IDLE: "idle", LOADING: "loading", DONE: "done", ERROR: "error" };

function Stars({ rating }) {
  if (!rating) return <span style={{ color: "#94a3b8", fontSize: 12 }}>Sem avaliação</span>;
  const full = Math.round(rating);
  return (
    <span style={{ color: "#f59e0b", fontSize: 13, letterSpacing: 1 }}>
      {"★".repeat(full)}{"☆".repeat(5 - full)}
      <span style={{ color: "#64748b", marginLeft: 5, fontSize: 11 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function LeadCard({ lead, index }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const text = [lead.nome, lead.telefone, lead.site, lead.endereco].filter(Boolean).join(" | ");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 0.2s",
        cursor: "default",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3b82f6")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e293b")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: "#475569", fontVariantNumeric: "tabular-nums" }}>
            #{String(index + 1).padStart(2, "0")}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", marginTop: 2, lineHeight: 1.3 }}>
            {lead.nome}
          </div>
          {lead.responsavel && (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>👤 {lead.responsavel}</div>
          )}
        </div>
        <button
          onClick={copy}
          style={{
            background: copied ? "#166534" : "#1e293b",
            border: "none", borderRadius: 6, padding: "4px 10px",
            cursor: "pointer", color: copied ? "#86efac" : "#94a3b8",
            fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
          }}
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>

      {lead.avaliacao && <Stars rating={parseFloat(lead.avaliacao)} />}

      {lead.telefone && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>📞</span>
          <a href={`tel:${lead.telefone}`} style={{ color: "#93c5fd", fontSize: 13, textDecoration: "none" }}>
            {lead.telefone}
          </a>
        </div>
      )}
      {lead.email && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>✉️</span>
          <a href={`mailto:${lead.email}`} style={{ color: "#93c5fd", fontSize: 13, textDecoration: "none" }}>
            {lead.email}
          </a>
        </div>
      )}
      {lead.site && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
          <span style={{ fontSize: 13 }}>🌐</span>
          <a
            href={lead.site.startsWith("http") ? lead.site : `https://${lead.site}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#93c5fd", fontSize: 12, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {lead.site.replace(/^https?:\/\//, "")}
          </a>
        </div>
      )}
      {lead.endereco && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <span style={{ fontSize: 13, marginTop: 1 }}>📍</span>
          <span style={{ color: "#64748b", fontSize: 12, lineHeight: 1.4 }}>{lead.endereco}</span>
        </div>
      )}
      {lead.descricao && (
        <div style={{ color: "#475569", fontSize: 12, fontStyle: "italic", borderTop: "1px solid #1e293b", paddingTop: 8, marginTop: 4 }}>
          {lead.descricao}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("prospector_gemini_key") || "");
  const [keyVisible, setKeyVisible] = useState(false);
  const [segment, setSegment] = useState(SEGMENT_PRESETS[0]);
  const [customQuery, setCustomQuery] = useState("");
  const [city, setCity] = useState("");
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");

  const finalQuery = segment.label === "Personalizado" ? customQuery : segment.query;

  const buildPrompt = (query, city) => `
Você é um assistente de prospecção B2B. Faça uma pesquisa detalhada na web e retorne uma lista de profissionais e empresas do segmento "${query}" na cidade de "${city}", Brasil.

Para cada lead encontrado, extraia:
- nome: nome do profissional ou empresa
- responsavel: nome do dono/responsável (se encontrar)
- telefone: número de telefone com DDD
- email: endereço de email (se encontrar)
- site: website
- endereco: endereço completo
- avaliacao: nota no Google (ex: 4.5)
- descricao: breve descrição da atuação (1 linha)

REGRA OBRIGATÓRIA: inclua APENAS leads que tenham TANTO telefone QUANTO email preenchidos. Ignore qualquer lead sem esses dois campos.

Retorne SOMENTE um JSON válido, sem texto adicional, sem markdown, sem backticks, no seguinte formato:
{"leads": [...]}

Busque pelo menos 15 leads reais. Pesquise em sites, Google Maps, LinkedIn e diretórios profissionais para encontrar telefone e email de cada um.
`;

  const handleSearch = useCallback(async () => {
    if (!city.trim()) { setErrorMsg("Informe a cidade."); setStatus(STATUS.ERROR); return; }
    if (!finalQuery.trim()) { setErrorMsg("Informe o segmento."); setStatus(STATUS.ERROR); return; }

    if (!apiKey.trim()) { setErrorMsg("Cole sua API Key do Google Gemini antes de buscar."); setStatus(STATUS.ERROR); return; }
    setStatus(STATUS.LOADING);
    setLeads([]);
    setErrorMsg("");

    const msgs = [
      "Pesquisando na web...",
      "Localizando profissionais...",
      "Coletando contatos...",
      "Organizando os leads...",
    ];
    let mi = 0;
    setLoadingMsg(msgs[0]);
    const interval = setInterval(() => {
      mi = (mi + 1) % msgs.length;
      setLoadingMsg(msgs[mi]);
    }, 2500);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tools: [{ google_search: {} }],
            contents: [{ role: "user", parts: [{ text: buildPrompt(finalQuery, city) }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4000 },
          }),
        }
      );

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Erro ${res.status}`);
      }

      const data = await res.json();
      const textBlock = { text: data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "" };
      if (!textBlock.text) throw new Error("Resposta vazia da IA.");

      // Extrai JSON mesmo que venha com texto em volta
      let raw = textBlock.text;
      const jsonMatch = raw.match(/\{[\s\S]*"leads"[\s\S]*\}/);
      if (!jsonMatch) throw new Error("IA não retornou dados estruturados. Tente novamente.");
      const parsed = JSON.parse(jsonMatch[0]);
      const allLeads = parsed.leads || [];
      // Filtra somente leads com telefone E email
      const foundLeads = allLeads.filter(l => l.telefone && l.telefone.trim() && l.email && l.email.trim());

      if (foundLeads.length === 0) {
        setStatus(STATUS.DONE);
        return;
      }

      setLeads(foundLeads);
      setStatus(STATUS.DONE);
    } catch (e) {
      clearInterval(interval);
      setErrorMsg(e.message || "Erro desconhecido.");
      setStatus(STATUS.ERROR);
    }
  }, [city, finalQuery, apiKey]);

  const exportCSV = () => {
    const rows = [["Nome", "Responsável", "Telefone", "Email", "Site", "Endereço", "Avaliação", "Descrição"]];
    leads.forEach(l => {
      rows.push([
        l.nome || "", l.responsavel || "", l.telefone || "", l.email || "",
        l.site || "", l.endereco || "", l.avaliacao || "", l.descricao || "",
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads_${city}_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020617",
      color: "#f1f5f9",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "32px 20px",
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 8, height: 32,
              background: "linear-gradient(180deg, #3b82f6, #6366f1)",
              borderRadius: 4, flexShrink: 0,
            }} />
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: "#f8fafc" }}>
              Prospector de Leads
            </h1>
          </div>
          <p style={{ margin: 0, marginLeft: 18, color: "#64748b", fontSize: 14 }}>
            Gemini + Google Search — encontra profissionais reais com contatos verificados
          </p>
        </div>

        {/* API Key */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
            Google Gemini API Key
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type={keyVisible ? "text" : "password"}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); localStorage.setItem("prospector_gemini_key", e.target.value); }}
              placeholder="AIza..."
              style={{
                flex: 1, background: "#020617", border: "1px solid #334155", borderRadius: 8,
                padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none", fontFamily: "monospace",
              }}
            />
            <button onClick={() => setKeyVisible(v => !v)} style={{
              background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "0 14px",
              color: "#94a3b8", cursor: "pointer", fontSize: 18,
            }}>
              {keyVisible ? "🙈" : "👁"}
            </button>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>
            Chave salva no seu navegador. Acesse{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>
              aistudio.google.com/app/apikey
            </a>{" "}para gerar a sua.
          </p>
        </div>

        {/* Search Config */}
        <div style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 12, padding: 20, marginBottom: 20,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Segment */}
          <div>
            <label style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
              Segmento
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SEGMENT_PRESETS.map(s => (
                <button
                  key={s.label}
                  onClick={() => setSegment(s)}
                  style={{
                    background: segment.label === s.label ? "#1d4ed8" : "#1e293b",
                    border: `1px solid ${segment.label === s.label ? "#3b82f6" : "#334155"}`,
                    borderRadius: 20, padding: "6px 14px", cursor: "pointer",
                    color: segment.label === s.label ? "#fff" : "#94a3b8",
                    fontSize: 13, transition: "all 0.15s",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {segment.label === "Personalizado" && (
              <input
                value={customQuery}
                onChange={e => setCustomQuery(e.target.value)}
                placeholder="Ex: nutricionista, arquiteto, personal trainer..."
                style={{
                  marginTop: 10, width: "100%", boxSizing: "border-box",
                  background: "#020617", border: "1px solid #334155", borderRadius: 8,
                  padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none",
                }}
              />
            )}
          </div>

          {/* City */}
          <div>
            <label style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
              Cidade
            </label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Ex: Maringá, Curitiba, São Paulo..."
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#020617", border: "1px solid #334155", borderRadius: 8,
                padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none",
              }}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={status === STATUS.LOADING}
            style={{
              background: status === STATUS.LOADING
                ? "#1e3a5f"
                : "linear-gradient(135deg, #1d4ed8, #4f46e5)",
              border: "none", borderRadius: 8, padding: "12px 0",
              cursor: status === STATUS.LOADING ? "not-allowed" : "pointer",
              color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
              transition: "opacity 0.2s",
            }}
          >
            {status === STATUS.LOADING ? `⏳ ${loadingMsg}` : "🔍 Buscar Leads"}
          </button>
        </div>

        {/* Error */}
        {status === STATUS.ERROR && (
          <div style={{
            background: "#1c0a0a", border: "1px solid #7f1d1d",
            borderRadius: 10, padding: "12px 16px", marginBottom: 20,
            color: "#fca5a5", fontSize: 13,
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Results */}
        {leads.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: "#64748b" }}>
                <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 18 }}>{leads.length}</span> leads com telefone e email
              </div>
              <button
                onClick={exportCSV}
                style={{
                  background: "#064e3b", border: "1px solid #059669", borderRadius: 8,
                  padding: "7px 16px", cursor: "pointer", color: "#6ee7b7", fontSize: 13, fontWeight: 600,
                }}
              >
                ⬇ Exportar CSV
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {leads.map((lead, i) => <LeadCard key={i} lead={lead} index={i} />)}
            </div>
          </>
        )}

        {status === STATUS.DONE && leads.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div>Nenhum resultado encontrado.</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Tente outro segmento ou cidade.</div>
          </div>
        )}

        <div style={{
          marginTop: 32, borderTop: "1px solid #1e293b", paddingTop: 16,
          fontSize: 11, color: "#334155", textAlign: "center",
        }}>
          Progrida Brasil · Busca via Gemini + Google Search · Uso interno de prospecção
        </div>
      </div>
    </div>
  );
}
