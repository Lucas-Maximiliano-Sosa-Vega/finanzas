"use client";

import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

/** Distancia (px) a partir de la cual soltar dispara la actualización. */
const THRESHOLD = 64;
/** Recorrido máximo del indicador (px). */
const MAX_PULL = 96;
/** El dedo se mueve más que el indicador: da sensación de resistencia. */
const RESISTANCE = 0.5;
/** Tiempo mínimo mostrando el spinner, para que no parpadee si responde rápido. */
const MIN_SPIN_MS = 700;

/** ¿Hay un diálogo/menú abierto que scrollea por su cuenta? Entonces no interferimos. */
function isOverlayOpen() {
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], [data-scroll-locked]'));
}

/**
 * "Tirar para actualizar" (como en las apps nativas): al estar arriba del todo
 * y arrastrar hacia abajo, vuelve a pedir los datos al servidor (router.refresh)
 * sin recargar la página. Solo actúa con gestos táctiles.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const setPullDistance = (value: number) => {
      pullRef.current = value;
      setPull(value);
    };

    const onTouchStart = (event: TouchEvent) => {
      const atTop = window.scrollY <= 0;
      startY.current = atTop && event.touches.length === 1 && !busy.current && !isOverlayOpen() ? event.touches[0].clientY : null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startY.current === null) return;
      const delta = event.touches[0].clientY - startY.current;

      if (delta <= 0 || window.scrollY > 0) {
        // Gesto hacia arriba o la página ya scrolleó: es un scroll normal.
        if (pullRef.current !== 0) setPullDistance(0);
        if (delta <= 0) startY.current = null;
        return;
      }

      // Evita el rebote nativo mientras se está tirando.
      if (event.cancelable) event.preventDefault();
      setPullDistance(Math.min(delta * RESISTANCE, MAX_PULL));
    };

    const onTouchEnd = () => {
      const shouldRefresh = startY.current !== null && pullRef.current >= THRESHOLD;
      startY.current = null;

      if (!shouldRefresh) {
        setPullDistance(0);
        return;
      }

      busy.current = true;
      setSpinning(true);
      setPullDistance(0); // mientras refresca, el indicador queda fijo (ver `shown`)

      startTransition(() => {
        router.refresh();
      });
      // El spinner dura como mínimo MIN_SPIN_MS; si la transición tarda más, sigue hasta que termine.
      window.setTimeout(() => {
        busy.current = false;
        setSpinning(false);
      }, MIN_SPIN_MS);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [router]);

  const refreshing = spinning || isPending;
  const shown = refreshing ? THRESHOLD : pull;
  const visible = shown > 0;
  const progress = Math.min(shown / THRESHOLD, 1);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <span className="sr-only">{refreshing ? "Actualizando…" : ""}</span>
      <div
        aria-hidden
        className={cn(
          "flex size-11 items-center justify-center rounded-full border bg-card text-primary shadow-lg",
          !visible && "opacity-0",
          // Al soltar, vuelve con animación; mientras se arrastra, sigue al dedo sin retraso.
          shown === THRESHOLD || shown === 0 ? "transition-[transform,opacity] duration-300 motion-reduce:transition-none" : "",
        )}
        style={{
          transform: `translateY(${visible ? shown - 52 : -64}px)`,
          opacity: visible ? Math.max(progress, 0.15) : 0,
        }}
      >
        <RefreshCwIcon
          className={cn("size-5", refreshing && "animate-spin motion-reduce:animate-none")}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  );
}
