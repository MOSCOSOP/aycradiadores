"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { COMPANY } from "@/lib/constants";

const STORAGE_KEY = "ify-chat-identity";
const POLL_MS = 4000;

type Identity = { customerId: number; name: string; dni: string };

type ChatMessage = {
  id: number;
  sender: "customer" | "admin";
  body: string;
  created_at: string;
  document: { id: number; full_number: string; total: number; url: string | null } | null;
};

function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.customerId && parsed?.dni) return parsed as Identity;
  } catch {
    /* localStorage no disponible */
  }
  return null;
}

function saveIdentity(identity: Identity) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* ignorar */
  }
}

function RegisterForm({ onRegistered }: { onRegistered: (identity: Identity) => void }) {
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/public/chat/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, dni }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo ingresar");
      const identity: Identity = json.data;
      saveIdentity(identity);
      onRegistered(identity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-auth-screen">
      <div className="chat-auth-card">
        <div className="chat-auth-logo">
          <Image src="/images/logo-client.png" alt={COMPANY.tradeName} width={56} height={56} />
        </div>
        <h1>{COMPANY.tradeName}</h1>
        <p className="chat-auth-subtitle">Escríbenos y te atendemos al instante</p>
        <form onSubmit={submit}>
          {error && <div className="chat-auth-error">{error}</div>}
          <label className="ify-label">Nombre completo</label>
          <input
            className="ify-input mb-3"
            placeholder="Ej. Juan Pérez Quispe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="ify-label">DNI</label>
          <input
            className="ify-input mb-4"
            placeholder="8 dígitos"
            inputMode="numeric"
            maxLength={8}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
            required
          />
          <button type="submit" className="ify-btn-primary w-full py-3" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar chat"}
          </button>
        </form>
        <p className="chat-auth-hint">
          Usa siempre el mismo nombre y DNI para volver a ver tu conversación.
        </p>
      </div>
    </div>
  );
}

function DocumentCard({ doc }: { doc: NonNullable<ChatMessage["document"]> }) {
  return (
    <a
      href={doc.url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="chat-doc-card"
    >
      <i className="bi bi-file-earmark-pdf" />
      <div>
        <strong>{doc.full_number}</strong>
        <span>S/ {doc.total.toFixed(2)} · Ver / descargar comprobante</span>
      </div>
      <i className="bi bi-box-arrow-up-right" />
    </a>
  );
}

function ChatThread({ identity, onSwitchUser }: { identity: Identity; onSwitchUser: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch(
        `/api/public/chat/messages?customer_id=${identity.customerId}&dni=${identity.dni}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      setMessages(json.data ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el chat");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.customerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch("/api/public/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: identity.customerId, dni: identity.dni, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo enviar");
      setMessages((prev) => [...prev, json.data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
      setText(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="chat-header-brand">
          <Image src="/images/logo-client.png" alt={COMPANY.tradeName} width={36} height={36} />
          <div>
            <strong>{COMPANY.tradeName}</strong>
            <span>{identity.name}</span>
          </div>
        </div>
        <button type="button" className="ify-btn-ghost text-xs" onClick={onSwitchUser}>
          Cambiar de usuario
        </button>
      </header>

      <div className="chat-body">
        {!loaded && <p className="chat-empty">Cargando conversación...</p>}
        {loaded && messages.length === 0 && (
          <p className="chat-empty">
            👋 Hola {identity.name.split(" ")[0]}, escríbenos qué necesitas (repuesto, servicio, cotización) y te
            responderemos aquí mismo.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.sender === "customer" ? "me" : "them"}`}>
            <div className="chat-bubble">
              {m.body && <p>{m.body}</p>}
              {m.document && <DocumentCard doc={m.document} />}
              <span className="chat-bubble-time">
                {new Date(m.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <div className="chat-error">{error}</div>}

      <form className="chat-input-bar" onSubmit={send}>
        <input
          className="ify-input"
          placeholder="Escribe tu mensaje..."
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

export function CustomerChatView() {
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined);

  useEffect(() => {
    setIdentity(loadIdentity());
  }, []);

  if (identity === undefined) return null;

  if (!identity) {
    return <RegisterForm onRegistered={setIdentity} />;
  }

  return (
    <ChatThread
      identity={identity}
      onSwitchUser={() => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignorar */
        }
        setIdentity(null);
      }}
    />
  );
}
