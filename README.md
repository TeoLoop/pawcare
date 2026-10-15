# Kira Care 🐾

Aplicación web personal para la gestión integral de medicamentos, recordatorios fiables por WhatsApp y seguimiento de salud de **Kira**.

Diseñada con estética cálida, sobria y moderna (tonos crema, gris cálido y verde salvia), interfaz mobile-first con barra lateral en escritorio y barra inferior en móvil, persistencia real y arquitectura escalable.

---

## 1. Stack Tecnológico

- **Framework**: [Next.js](https://nextjs.org/) con App Router y React 19.
- **Tipado**: TypeScript en modo estricto (`strict: true`).
- **Estilos**: Tailwind CSS con diseño de tokens naturales y cálidos.
- **Iconografía**: [Lucide React](https://lucide.dev/).
- **Base de Datos & Auth**: [Supabase](https://supabase.com/) (PostgreSQL normalizado con Row Level Security y triggers de auditoría).
- **Mensajería**: WhatsApp Business Platform Cloud API oficial de Meta.
- **Validación**: Zod.
- **Reportes Clínicos**: jsPDF para exportación de historias y pautas veterinarias.
- **Pruebas**: Vitest y Testing Library.

---

## 2. Puesta en Marcha Local

### Prerrequisitos
- Node.js versión 20 o superior (verificado con Node v24).
- Gestor de paquetes `npm`.

### Instalación y Ejecución

```bash
# 1. Navegar a la carpeta del proyecto
cd kira-care

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno locales
# (Ya existe un .env.local preconfigurado para desarrollo)
cp .env.example .env.local

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará accesible en [http://localhost:3000](http://localhost:3000).

### Comprobaciones y Pruebas

```bash
# Ejecutar suite de pruebas unitarias e integración (15 tests)
npm run test

# Verificar tipos y compilar la aplicación para producción
npm run build

# Ejecutar el linter
npm run lint
```

---

## 3. Modo de Desarrollo vs. Modo Producción

Kira Care cuenta con un **adaptador seguro de entorno**:
- **Sin credenciales de Meta**: La aplicación funciona en modo de simulación segura. Los recordatorios se programan, procesan y registran con auditoría completa en la consola y en el repositorio local sin errores.
- **Con credenciales de Meta**: Despacha mensajes directamente a través de los servidores oficiales de Meta Cloud API (`graph.facebook.com`).

---

## 4. Guía de Configuración de Supabase

El esquema de base de datos se encuentra totalmente versionado en `supabase/migrations/`:
- `001_initial_schema.sql`: 13 tablas normalizadas, claves foráneas, restricciones de unicidad, índices y triggers.
- `002_row_level_security.sql`: Políticas de Row Level Security (RLS) que garantizan que ningún usuario pueda acceder a datos ajenos.

### Pasos para conectar Supabase:

1. Creá un nuevo proyecto en [Supabase Dashboard](https://database.new).
2. Andá a **SQL Editor** en el panel lateral de Supabase.
3. Copiá y ejecutá secuencialmente:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_row_level_security.sql`
4. En **Project Settings > API**, copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (mantener en secreto)
5. Pegá estas claves en tu archivo `.env.local`.

---

## 5. Guía de Configuración de WhatsApp Cloud API (Meta)

Kira Care integra la API oficial de WhatsApp Cloud para máxima fiabilidad.

### Pasos en Meta for Developers:

1. Ingresá a [Meta for Developers](https://developers.facebook.com/) y creá una app de tipo **Business**.
2. Añadí el producto **WhatsApp**.
3. En el panel de WhatsApp > **Configuración de la API**:
   - Copiá el **Identificador de número de teléfono** → `WHATSAPP_PHONE_NUMBER_ID`.
   - Copiá el **Identificador de cuenta de WhatsApp Business** → `WHATSAPP_BUSINESS_ACCOUNT_ID`.
   - Generá un Token de Acceso del Sistema (permanente) → `WHATSAPP_API_TOKEN`.
4. En **Configuración > Webhooks**:
   - URL de devolución de llamada: `https://tu-dominio.com/api/whatsapp/webhook`
   - Token de verificación: el valor que definas en `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (ej: una cadena segura aleatoria).
   - Suscribite al campo: `messages`.
5. En **Ajustes de la App > Básica**:
   - Copiá el **Secreto de la app** → `META_APP_SECRET` (para verificar firmas HMAC SHA-256).

### Plantilla de Mensaje recomendada (Meta Template):
Nombre: `kira_medication_reminder`
Categoría: `UTILITY`
Idioma: Español (`es`)
Cuerpo:
```
Kira Care: tenés una medicación pendiente para {{1}}. Tratamiento: {{2}}. Horario previsto: {{3}}. Consultá la pauta registrada antes de administrarla. Para registrar la toma, abrí: {{4}}
```

---

## 6. Automatización de Recordatorios (Scheduler & Cron)

Para ejecutar el envío programado de avisos según la zona horaria `America/Montevideo`, el endpoint seguro es:

```http
POST /api/cron/send-reminders
Header: Authorization: Bearer <CRON_SECRET>
```

### Opciones de ejecución:
- **Vercel Cron Jobs**: Agregando una regla en `vercel.json` para ejecutar cada 5 o 10 minutos.
- **Supabase pg_cron + Edge Functions**: Llamando al endpoint con la clave secreta.
- **Monitor externo (cron-job.org o similar)**: Disparando cada 5 minutos mediante una petición GET o POST autenticada.

---

## 7. Respaldo y Restauración de Datos

- **Exportación en 1 clic**: Desde la sección **Ajustes > Copia de Seguridad**, hacé clic en **Exportar JSON** para descargar un volcado completo de tomas, pautas, observaciones y visitas veterinarias.
- **Resumen Clínico en PDF**: Desde **Salud > Descargar Resumen PDF**, generá un informe profesional que distingue explícitamente entre diagnósticos emitidos por el veterinario y observaciones cotidianas del cuidador.
