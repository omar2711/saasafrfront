"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, getToken } from "@/lib/api-client";
import { AdminRow } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
export function LegalDocument({ kind }: { kind: "terms" | "privacy" }) {
  const [doc, setDoc] = useState<AdminRow | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    apiRequest<AdminRow | null>(`/legal/${kind}`, { requiresTenant: false })
      .then((d) => {
        if (alive) setDoc(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [kind]);
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 py-12">
      <Link href="/login" className="underline">
        Volver al acceso
      </Link>
      <h1 className="text-3xl font-semibold">
        {kind === "terms" ? "Términos y condiciones" : "Política de privacidad"}
      </h1>
      {loading && <p>Cargando…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !doc && (
        <p>El documento está pendiente de revisión y publicación por AFR.</p>
      )}
      {doc && (
        <>
          <p className="text-sm text-muted-foreground">
            Versión {doc.version} · Publicado{" "}
            {String(doc.published_at).slice(0, 10)}
          </p>
          <article className="whitespace-pre-wrap leading-relaxed">
            {doc.content}
          </article>
          {getToken() && (
            <Button
              disabled={accepted || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await apiRequest(`/legal/${doc.id}/accept`, {
                    method: "POST",
                    requiresTenant: false,
                  });
                  setAccepted(true);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "No se pudo registrar la aceptación.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {accepted
                ? "Aceptación registrada"
                : busy
                  ? "Guardando…"
                  : "He leído y acepto esta versión"}
            </Button>
          )}
        </>
      )}
    </main>
  );
}
