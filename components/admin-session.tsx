"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi, MeResponse } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
const Session = createContext<MeResponse | null>(null);
export function useAdminSession() {
  return useContext(Session);
}
export function AdminSession({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    let alive = true;
    authApi
      .me()
      .then((me) => {
        if (!alive) return;
        if (!me.isSuperAdmin && me.platformRole !== "accountant") {
          router.replace("/login");
          return;
        }
        setUser(me);
      })
      .catch(() => {
        if (alive)
          setError("No se pudo verificar tu sesión. Inicia sesión nuevamente.");
      });
    return () => {
      alive = false;
    };
  }, [router]);
  useEffect(() => {
    if (user?.platformRole === "accountant" && path !== "/admin/finance")
      router.replace("/admin/finance");
  }, [user, path, router]);
  if (error)
    return (
      <div className="p-8 space-y-4">
        <p role="alert">{error}</p>
        <Button onClick={() => router.replace("/login")}>Iniciar sesión</Button>
      </div>
    );
  if (
    !user ||
    (user.platformRole === "accountant" && path !== "/admin/finance")
  )
    return <p className="p-8">Verificando acceso…</p>;
  return <Session.Provider value={user}>{children}</Session.Provider>;
}
