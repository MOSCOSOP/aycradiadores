"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { COMPANY } from "@/lib/constants";

const STORAGE_KEY = "ify-chat-identity";
const POLL_MS = 4000;
const MAX_IMAGE_WIDTH = 1000;

type Identity = { customerId: number; name: string; dni: string };

type ChatMessage = {
  id: number;
  sender: "customer" | "admin";
  body: string;
  image_url: string | null;
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

/** Comprime la foto en el navegador antes de enviarla (se guarda como data URL, sin
 * necesitar un servicio de almacenamiento aparte). */
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = document.createElement("img");
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No se pudo procesar la imagen"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="chat-auth-screen">
      <div className="chat-auth-card">
        <div className="chat-auth-logo">
          <Image src="/images/logo-client.png" alt={COMPANY.tradeName} width={56} height={56} />
        </div>
        <h1>{COMPANY.tradeName}</h1>
        <p className="chat-auth-subtitle">Escríbenos y te atendemos al instante</p>
        {children}
      </div>
    </div>
  );
}

function PinInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      className="ify-input mb-3 text-center tracking-[0.5em]"
      placeholder="••••••"
      inputMode="numeric"
      maxLength={6}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      required
    />
  );
}

function RegisterForm({ onRegistered }: { onRegistered: (identity: Identity) => void }) {
  const [step, setStep] = useState<"identify" | "create-pin" | "enter-pin">("identify");
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [existingName, setExistingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 3) return setError("Escribe tu nombre completo.");
    if (dni.length !== 8) return setError("El DNI debe tener 8 dígitos.");
    setLoading(true);
    try {
      const res = await fetch("/api/public/chat/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo continuar");
      if (json.data.exists) {
        setExistingName(json.data.name);
        setStep("enter-pin");
      } else {
        setStep("create-pin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo continuar");
    } finally {
      setLoading(false);
    }
  };

  const submitCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pin.length !== 6) return setError("El PIN debe tener 6 dígitos.");
    if (pin !== pinConfirm) return setError("Los PIN no coinciden, vuelve a intentarlo.");
    setLoading(true);
    try {
      const res = await fetch("/api/public/chat/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, dni, pin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo crear tu cuenta");
      const identity: Identity = json.data;
      saveIdentity(identity);
      onRegistered(identity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear tu cuenta");
    } finally {
      setLoading(false);
    }
  };

  const submitEnterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pin.length !== 6) return setError("Ingresa tu PIN de 6 dígitos.");
    setLoading(true);
    try {
      const res = await fetch("/api/public/chat/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni, pin }),
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

  if (step === "create-pin") {
    return (
      <AuthShell>
        <form onSubmit={submitCreatePin}>
          {error && <div className="chat-auth-error">{error}</div>}
          <p className="mb-3 text-sm">
            Hola <strong>{name}</strong>, crea un PIN de 6 dígitos para proteger tu conversación. Lo usarás la próxima
            vez que quieras escribirnos.
          </p>
          <label className="ify-label">Crea tu PIN</label>
          <PinInput value={pin} onChange={setPin} autoFocus />
          <label className="ify-label">Repite tu PIN</label>
          <PinInput value={pinConfirm} onChange={setPinConfirm} />
          <button type="submit" className="ify-btn-primary w-full py-3" disabled={loading}>
            {loading ? "Creando..." : "Crear PIN e iniciar chat"}
          </button>
          <button type="button" className="ify-btn-ghost w-full py-2 mt-2 text-xs" onClick={() => setStep("identify")}>
            Volver
          </button>
        </form>
      </AuthShell>
    );
  }

  if (step === "enter-pin") {
    return (
      <AuthShell>
        <form onSubmit={submitEnterPin}>
          {error && <div className="chat-auth-error">{error}</div>}
          <p className="mb-3 text-sm">
            👋 Hola de nuevo, <strong>{existingName}</strong>. Ingresa tu PIN de 6 dígitos para ver tu conversación.
          </p>
          <label className="ify-label">Tu PIN</label>
          <PinInput value={pin} onChange={setPin} autoFocus />
          <button type="submit" className="ify-btn-primary w-full py-3" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
          <button type="button" className="ify-btn-ghost w-full py-2 mt-2 text-xs" onClick={() => setStep("identify")}>
            No soy {existingName}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={submitIdentify}>
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
          {loading ? "Verificando..." : "Continuar"}
        </button>
      </form>
      <p className="chat-auth-hint">Si es tu primera vez, crearás un PIN. Si ya escribiste antes, te pediremos tu PIN.</p>
    </AuthShell>
  );
}

function DocumentCard({ doc }: { doc: NonNullable<ChatMessage["document"]> }) {
  return (
    <a href={doc.url ?? "#"} target="_blank" rel="noreferrer" className="chat-doc-card">
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const sendPayload = async (payload: { body: string; image?: string }) => {
    setSending(true);
    try {
      const res = await fetch("/api/public/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: identity.customerId, dni: identity.dni, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo enviar");
      setMessages((prev) => [...prev, json.data]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    await sendPayload({ body });
  };

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await sendPayload({ body: text.trim(), image: dataUrl });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la foto");
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
            responderemos aquí mismo. También puedes enviarnos una foto.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.sender === "customer" ? "me" : "them"}`}>
            <div className="chat-bubble">
              {m.image_url && (
                <a href={m.image_url} target="_blank" rel="noreferrer">
                  <img src={m.image_url} alt="Foto enviada" className="chat-bubble-img" />
                </a>
              )}
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
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handlePickImage}
        />
        <button
          type="button"
          className="ify-btn-ghost px-2"
          title="Enviar una foto"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <i className="bi bi-camera" />
        </button>
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
