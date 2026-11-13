# Finanzas

Panel personal de finanzas: presupuestos, regla 50/30/20 con alertas, contador de nómina, historial de desvíos, proyección de ahorro y exportación.

**Stack:** Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript estricto · Tailwind CSS v4 · shadcn/ui (Radix) · Supabase (Postgres + Auth + Realtime) · next-themes.

## Puesta en marcha

1. **Node ≥ 22** (supabase-js deja de soportar Node 20).
2. Crea un proyecto en Supabase y aplica el esquema:
   - SQL Editor → ejecuta en orden los archivos de `supabase/migrations/` (`…_init.sql` y `…_account_balances.sql`), o
   - `npx supabase link --project-ref <ref> && npx supabase db push`.
3. **Desactiva los registros:** Authentication → Sign In / Providers → desactiva *Allow new users to sign up*.
4. Crea tu usuario en Authentication → Users → *Add user* (marca *Auto Confirm*). Un trigger le crea el perfil, 3 cuentas y las categorías 50/30/20 por defecto.
5. Ajusta tu moneda y zona horaria (el día de cobro ya es 25):
   ```sql
   update public.profiles set currency = 'PYG', timezone = 'America/Asuncion';
   ```
6. `cp .env.example .env.local` y rellena la URL y la *publishable key* (Project Settings → API Keys).
7. `npm run dev` → http://localhost:3000
8. (Opcional) Para ver el dashboard con datos, ejecuta `supabase/seed-demo.sql` en el SQL Editor.

## Decisiones clave

- **El "mes" es el ciclo de cobro (25 → 24).** Si se usara el mes natural, del día 1 al 24 no habría ingresos y todas las alertas 50/30/20 saltarían. Los presupuestos y el historial usan el mismo ciclo. SQL (`pay_cycle_start`) y TypeScript (`lib/finance/pay-cycle.ts`) calculan el ciclo de la misma forma.
- **Agregaciones en Postgres** (`cycle_rule_totals`, `category_spending`): el dashboard hace 1 consulta de perfil + 4 en paralelo, sin traer transacciones al servidor.
- **Seguridad en capas:** `proxy.ts` hace la redirección optimista; `requireUser()` valida el JWT en la capa de datos; **RLS** aísla cada fila y unos triggers impiden referenciar cuentas o categorías ajenas.
- **Ahorro = meta mínima, no techo:** superar el 20 % se marca como "Meta cumplida", nunca como alerta.
- **Alertas:** preventiva al llegar a `alert_threshold_pct` (85 % por defecto) del límite, crítica al superarlo. Se aplican a los bloques 50/30/20, a las categorías con `target_pct` (% de ingresos), a los presupuestos por categoría y al presupuesto global.
- **Presupuestos dinámicos:** con `period_start = null` el presupuesto es recurrente; uno con fecha concreta lo reemplaza solo en ese ciclo.
- **Tiempo real:** `RealtimeRefresh` escucha cambios en Supabase y re-renderiza los Server Components (`router.refresh()`).
- **Estado global de cliente:** no hace falta todavía (tema con next-themes, datos en el servidor). Zustand entra cuando haya formularios con estado compartido entre vistas.

## Estructura

```
supabase/
  migrations/…_init.sql     Esquema, RLS, triggers, funciones y datos iniciales
  seed-demo.sql             Datos de ejemplo (opcional)
src/
  proxy.ts                  Refresco de sesión + redirección (antes middleware.ts)
  app/
    layout.tsx              Fuentes, ThemeProvider, Tooltip, Toaster
    globals.css             Tokens de tema (claro/oscuro), colores 50/30/20 y de estado
    (auth)/login/           Pantalla negra de acceso (sin registro)
    (app)/                  Zona autenticada: dashboard + movimientos, presupuestos, categorias, cuentas, ajustes
    api/export/route.ts     Descarga CSV/JSON de todas las transacciones
  features/                 Código por dominio
    auth/actions.ts         signIn / signOut (Server Actions)
    transactions/ · categories/ · accounts/ · budgets/ · settings/
                            actions.ts (Server Actions + zod) · queries.ts · components/
    dashboard/queries.ts    Capa de datos del dashboard (server-only)
    dashboard/components/   Widgets del dashboard
    export/                 Menú y generación de la exportación
  lib/
    finance/                Lógica pura y testeable: fechas, ciclo de cobro, regla 50/30/20, proyección
    supabase/               Clientes server / browser / proxy
    auth.ts · env.ts · format.ts · utils.ts
  components/
    ui/                     shadcn/ui (generado)
    layout/ · providers/ · meter.tsx · theme-toggle.tsx
  types/database.ts         Tipos del esquema (regenerables con `supabase gen types`)
```

## Secciones

| Ruta | Qué hace |
|---|---|
| `/` | Resumen: contador al día 25, 50/30/20, alertas, proyección, historial |
| `/movimientos` | Registrar, editar y eliminar ingresos/gastos, navegando por ciclos |
| `/presupuestos` | Límites globales o por categoría, recurrentes o de un solo ciclo |
| `/categorias` | Categorías y subcategorías por bloque 50/30/20, con tope opcional (% de ingresos) |
| `/cuentas` | Efectivo, banco, tarjetas…: saldo actual, archivar, eliminar |
| `/ajustes` | Moneda, zona horaria, porcentajes de la regla y umbral de alerta |

El botón **+ Movimiento** de la cabecera está disponible en todas las páginas.

## Instalarla como app (PWA)

La app se puede instalar en el teléfono sin pasar por ninguna tienda: es el mismo sitio, con ícono y pantalla propia.

- **iPhone (Safari):** abrir el sitio → botón compartir → **Agregar a inicio**.
- **Android (Chrome):** abrir el sitio → menú ⋮ → **Instalar app** (o el banner que aparece solo).

Archivos involucrados: `src/app/manifest.ts` (nombre, colores, íconos para Android/Chrome) y `src/app/icon.png` / `src/app/apple-icon.png` (favicon e ícono de iOS; Next los detecta por convención de archivo). Los íconos se generaron con `next/og` a partir de un cuadrado azul con "$"; para cambiar el diseño, regenerarlos con `ImageResponse` y reemplazar esos archivos.

**Importante:** `/manifest.webmanifest` está excluido a propósito del `matcher` de `proxy.ts` — Chrome necesita poder leerlo sin sesión iniciada para decidir si ofrece instalar la app. Si en el futuro se agregan más rutas públicas (sin login), hay que excluirlas ahí también.

No incluye service worker: no hay modo offline ni notificaciones push. Si más adelante hace falta, la guía oficial de Next.js (`docs/app/guides/progressive-web-apps.md` dentro de `node_modules/next`) explica cómo sumarlas.

## Registrar facturas desde Claude (MCP)

`/api/mcp` es un servidor MCP (Streamable HTTP, sin estado). Permite mandarle a Claude la foto de una factura (o un gasto escrito) y que cree el movimiento, además de gestionar la app desde el chat.

| Herramienta | Qué hace |
|---|---|
| `listar_cuentas`, `listar_categorias`, `listar_presupuestos`, `obtener_ajustes` | Lectura (las cuentas incluyen saldo actual) |
| `listar_movimientos_recientes` | Últimos movimientos, con filtros por fecha, cuenta y categoría |
| `resumen_ciclo` | Ingresos, 50/30/20 frente a su límite y gasto por categoría del ciclo de cobro |
| `crear_movimiento` | Registra un gasto/ingreso (evita duplicados exactos) |
| `actualizar_movimiento`, `eliminar_movimiento` | Corregir o borrar (el borrado es permanente) |
| `guardar_cuenta` | Crear/editar/archivar cuentas |
| `guardar_categoria` | Crear/editar categorías y subcategorías |
| `guardar_presupuesto`, `eliminar_presupuesto` | Presupuestos globales o por categoría, recurrentes o del ciclo |
| `actualizar_ajustes` | Moneda, zona horaria, día de cobro, reparto 50/30/20 y umbral de alerta |

No hay herramientas para borrar cuentas ni categorías: se archivan o se borran desde la app.

1. En Vercel → Settings → Environment Variables agregar (en Production, y volver a desplegar):
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase → Project Settings → API → `service_role`. **Secreta: nunca en el código ni con prefijo `NEXT_PUBLIC_`.**
   - `MCP_USER_ID`: UUID de tu usuario (Supabase → Authentication → Users).
   - `MCP_SECRET`: clave larga y aleatoria (mín. 24 caracteres), p. ej. `openssl rand -hex 32`.
2. En Claude → Configuración → Conectores → *Agregar conector personalizado*, URL:
   `https://TU-APP.vercel.app/api/mcp?key=MCP_SECRET`
3. Probar: mandar la foto de una factura y pedir "registrala".

Notas de seguridad: el endpoint usa la clave de servicio (salta RLS), por eso filtra siempre por `MCP_USER_ID` y está excluido de `proxy.ts`. Quien tenga la URL con la clave puede crear movimientos: no compartirla, y rotar `MCP_SECRET` si se filtra. Es para un único usuario.

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
