"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";

const LIST_POLL_MS = 8000;
const THREAD_POLL_MS = 4000;

type Conversation = {
  id: number;
  name: string;
  dni: string;
  last_message: string;
  last_message_at: string;
  last_message_sender: "customer" | "admin" | null;
  unread_count: number;
};

type ChatMessage = {
  id: number;
  sender: "customer" | "admin";
  body: string;
  image_url: string | null;
  created_at: string;
  document: { id: number; full_number: string; total: number; url: string | null } | null;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

function ProductLookup({ onInsert }: { onInsert: (text: string) => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.items.search(search, 5).then((r) => setResults(r.data ?? [])).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="chat-admin-tool">
      <input
        className="ify-input text-sm"
        placeholder="Buscar producto por nombre o código..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      {results.length > 0 && (
        <div className="chat-admin-tool-results">
          {results.map((p) => {
            const stock = Number(p.stock ?? 0);
            const price = Number(p.sale_unit_price ?? 0);
            return (
              <button
                key={String(p.id)}
                type="button"
                className="chat-product-result"
                onClick={() =>
                  onInsert(
                    `${p.description} — S/ ${price.toFixed(2)} · ${stock > 0 ? `${stock} disponibles en stock` : "sin stock por el momento"}`
                  )
                }
              >
                <span className="chat-product-result-name">{String(p.description)}</span>
                <span className={`chat-product-result-stock ${stock > 0 ? "in" : "out"}`}>
                  S/ {price.toFixed(2)} · {stock > 0 ? `Stock: ${stock}` : "Sin stock"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttachDocument({ onAttach }: { onAttach: (doc: Record<string, unknown>) => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api.documents
        .records({ page: 1, limit: 6, column: "number", value: search })
        .then((r) => setResults(r.data ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="chat-admin-tool">
      <input
        className="ify-input text-sm"
        placeholder="Buscar comprobante por número..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      {loading && <p className="chat-admin-tool-hint">Buscando...</p>}
      {results.length > 0 && (
        <div className="chat-admin-tool-results">
          {results.map((d) => (
            <button key={String(d.id)} type="button" className="chat-product-result" onClick={() => onAttach(d)}>
              <span className="chat-product-result-name">{String(d.number)}</span>
              <span className="chat-product-result-stock in">
                S/ {Number(d.total ?? 0).toFixed(2)} · {String(d.customer_name ?? "")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="ify-empty-state">
        <i className="bi bi-chat-dots ify-empty-state-icon" />
        <p className="ify-empty-state-title">Aún no hay conversaciones</p>
        <p className="ify-empty-state-description">
          Comparte el enlace del chat con tus clientes para que puedan escribirte.
        </p>
      </div>
    );
  }

  return (
    <div className="chat-conv-list">
      {conversations.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chat-conv-item ${selectedId === c.id ? "active" : ""}`}
          onClick={() => onSelect(c.id)}
        >
          <div className="chat-conv-avatar">{c.name.charAt(0).toUpperCase()}</div>
          <div className="chat-conv-info">
            <div className="chat-conv-top">
              <strong>{c.name}</strong>
              <span>{timeAgo(c.last_message_at)}</span>
            </div>
            <div className="chat-conv-bottom">
              <p>
                {c.last_message_sender === "admin" ? "Tú: " : ""}
                {c.last_message || "Sin mensajes"}
              </p>
              {c.unread_count > 0 && <span className="chat-conv-badge">{c.unread_count}</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function Thread({ conversationId, onClosed }: { conversationId: number; onClosed: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customer, setCustomer] = useState<{ id: number; name: string; dni: string } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [tool, setTool] = useState<"none" | "product" | "attach">("none");
  const [linking, setLinking] = useState(false);
  const [feedback, setFeedback] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    api.messages
      .thread(conversationId)
      .then((r) => {
        setMessages((r.data as ChatMessage[]) ?? []);
        setCustomer((r.customer as { id: number; name: string; dni: string }) ?? null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    setMessages([]);
    load();
    const interval = setInterval(load, THREAD_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async (documentId?: number, overrideText?: string) => {
    const body = (overrideText ?? text).trim();
    if (!body && !documentId) return;
    setSending(true);
    try {
      const res = await api.messages.reply(conversationId, body, documentId);
      setMessages((prev) => [...prev, res.data as ChatMessage]);
      setText("");
      setTool("none");
    } catch {
      /* se reintenta con el próximo poll */
    } finally {
      setSending(false);
    }
  };

  const createComprobante = async () => {
    setLinking(true);
    setFeedback("");
    try {
      const res = await api.messages.linkCustomer(conversationId);
      const customerId = (res.data as { id: number }).id;
      window.open(`/documents/create?customer_id=${customerId}`, "_blank");
      setFeedback("Se abrió una pestaña nueva con el cliente ya seleccionado. Al terminar, usa \"Adjuntar comprobante\" aquí para enviárselo.");
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "No se pudo preparar el comprobante");
    } finally {
      setLinking(false);
    }
  };

  const clearChat = async () => {
    if (!confirm("¿Vaciar esta conversación? Se borrarán todos los mensajes, pero el cliente conserva su cuenta y puede seguir escribiendo.")) return;
    try {
      await api.messages.clear(conversationId);
      setMessages([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo vaciar la conversación");
    }
  };

  const deleteChat = async () => {
    if (!confirm("¿Eliminar esta conversación por completo? El cliente tendría que registrarse de nuevo si vuelve a escribir. Esta acción no se puede deshacer.")) return;
    try {
      await api.messages.deleteConversation(conversationId);
      onClosed();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar la conversación");
    }
  };

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="chat-header-brand">
          <div className="chat-conv-avatar">{customer?.name.charAt(0).toUpperCase() ?? "?"}</div>
          <div>
            <strong>{customer?.name ?? "Cliente"}</strong>
            <span>DNI {customer?.dni ?? "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="ify-btn-outline text-xs" onClick={createComprobante} disabled={linking}>
            <i className="bi bi-receipt" /> {linking ? "Preparando..." : "Crear comprobante"}
          </button>
          <button type="button" className="ify-btn-ghost px-2" title="Vaciar chat" onClick={clearChat}>
            <i className="bi bi-eraser" />
          </button>
          <button type="button" className="ify-btn-ghost px-2 text-red-600" title="Eliminar conversación" onClick={deleteChat}>
            <i className="bi bi-trash" />
          </button>
        </div>
      </header>

      <div className="chat-body">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.sender === "admin" ? "me" : "them"}`}>
            <div className="chat-bubble">
              {m.image_url && (
                <a href={m.image_url} target="_blank" rel="noreferrer">
                  <img src={m.image_url} alt="Foto enviada por el cliente" className="chat-bubble-img" />
                </a>
              )}
              {m.body && <p>{m.body}</p>}
              {m.document && (
                <a href={m.document.url ?? "#"} target="_blank" rel="noreferrer" className="chat-doc-card">
                  <i className="bi bi-file-earmark-pdf" />
                  <div>
                    <strong>{m.document.full_number}</strong>
                    <span>S/ {m.document.total.toFixed(2)} · Ver / descargar comprobante</span>
                  </div>
                  <i className="bi bi-box-arrow-up-right" />
                </a>
              )}
              <span className="chat-bubble-time">
                {new Date(m.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {feedback && <div className="chat-error chat-hint">{feedback}</div>}

      {tool === "product" && <ProductLookup onInsert={(v) => { setText(v); setTool("none"); }} />}
      {tool === "attach" && (
        <AttachDocument onAttach={(doc) => sendMessage(Number(doc.id), "Te comparto tu comprobante:")} />
      )}

      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <button
          type="button"
          className="ify-btn-ghost px-2"
          title="Buscar producto"
          onClick={() => setTool(tool === "product" ? "none" : "product")}
        >
          <i className="bi bi-box-seam" />
        </button>
        <button
          type="button"
          className="ify-btn-ghost px-2"
          title="Adjuntar comprobante"
          onClick={() => setTool(tool === "attach" ? "none" : "attach")}
        >
          <i className="bi bi-paperclip" />
        </button>
        <input
          className="ify-input"
          placeholder="Escribe tu respuesta..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="ify-btn-primary" disabled={sending || !text.trim()}>
          <i className="bi bi-send" />
        </button>
      </form>
    </div>
  );
}

export function AdminMessagesInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadList = () => {
    api.messages
      .conversations()
      .then((r) => setConversations((r.data as Conversation[]) ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    const interval = setInterval(loadList, LIST_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ify-page">
      <div className="mb-4">
        <h1 className="text-lg font-bold">Mensajes</h1>
        <p className="text-xs text-[var(--muted)]">
          Chat en vivo con tus clientes ·{" "}
          <a href="/chat" target="_blank" rel="noreferrer" className="ify-link">
            Ver enlace público del chat
          </a>
        </p>
      </div>

      <div className={`chat-layout ${selectedId ? "show-thread" : ""}`}>
        <div className="chat-layout-list ify-card">
          {loading ? (
            <div className="p-8 text-center text-[var(--muted)]">
              <i className="bi bi-arrow-repeat animate-spin mr-2" /> Cargando...
            </div>
          ) : (
            <ConversationList conversations={conversations} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
        <div className="chat-layout-thread ify-card">
          {selectedId ? (
            <>
              <button type="button" className="chat-back-btn" onClick={() => setSelectedId(null)}>
                <i className="bi bi-arrow-left" /> Conversaciones
              </button>
              <Thread
                conversationId={selectedId}
                onClosed={() => {
                  setSelectedId(null);
                  loadList();
                }}
              />
            </>
          ) : (
            <div className="ify-empty-state">
              <i className="bi bi-chat-square-text ify-empty-state-icon" />
              <p className="ify-empty-state-title">Elige una conversación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
