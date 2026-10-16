# PawCare 🐾

Aplicación web para la gestión integral de medicamentos, recordatorios prácticos por WhatsApp y seguimiento de salud para tus mascotas (Kira y más).

Diseñada con estética cálida, sobria y moderna (tonos crema, gris cálido y verde salvia), interfaz mobile-first con barra lateral en escritorio y barra inferior en móvil, persistencia real en Supabase PostgreSQL y arquitectura escalable.

---

## 1. Stack Tecnológico

- **Framework**: [Next.js](https://nextjs.org/) con App Router y React 19.
- **Tipado**: TypeScript en modo estricto (`strict: true`).
- **Estilos**: Tailwind CSS con diseño de tokens naturales y cálidos.
- **Iconografía**: [Lucide React](https://lucide.dev/).
- **Base de Datos & Auth**: [Supabase](https://supabase.com/) (PostgreSQL normalizado con Row Level Security y triggers de auditoría).
- **Recordatorios WhatsApp**: Enlaces directos Click-to-Chat (`wa.me`) sin requisitos de empresa + CallMeBot API personal opcional.
- **Validación**: Zod.
- **Reportes Clínicos**: jsPDF para exportación de historias y pautas veterinarias.
- **Pruebas**: Vitest y Testing Library.

---

## 2. Puesta en Marcha Local

### Prerrequisitos
- Node.js versión 20 o superior.
- Gestor de paquetes `npm`.

### Instalación y Ejecución

```bash
# 1. Navegar a la carpeta del proyecto
cd pawcare

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
# Ejecutar suite de pruebas unitarias e integración (16 tests)
npm run test

# Verificar tipos y compilar la aplicación para producción
npm run build

# Ejecutar el linter (0 errores, 0 advertencias)
npm run lint
```

---

## 3. Recordatorios por WhatsApp (Sin Cuenta de Empresa en Meta)

PawCare implementa soluciones directas para recibir y enviar avisos por WhatsApp **sin necesidad de registrar ninguna empresa en Meta** ni pasar por procesos comerciales complejos:

### Alternativa 1: Enlaces Directos Click-to-Chat (`wa.me`) — ¡Recomendada!
- **0 Configuración**: No requiere API keys, ni tarjetas, ni cuentas de desarrollador.
- **1 Clic**: Desde el Panel de Inicio o al registrar cualquier dosis, hacés clic en **"WhatsApp"** o **"Avisar por WhatsApp"**.
- Se abre la app de WhatsApp (en el celular o en la computadora) con el mensaje de la dosis pre-formateado con emojis y hora de la toma, listo para enviártelo a tu propio chat personal ("Tú / Notas") o compartírselo a un familiar o cuidador.

### Alternativa 2: Bot Personal Automatizado (CallMeBot) — Opcional
Si preferís que un bot te mande mensajes automáticos programados a tu WhatsApp personal sin tener que pulsar ningún botón:
1. Desde tu WhatsApp personal, enviá el mensaje `I allow callmebot to send me messages` al número **+34 644 26 33 77**.
2. El bot te responderá al instante con tu **API Key personal gratuita**.
3. En PawCare, ingresá a **Ajustes > Recordatorios de WhatsApp** y pegá tu API Key.

---

## 4. Guía de Configuración de Supabase

El esquema de base de datos se encuentra totalmente versionado en `supabase/migrations/`:
- `001_initial_schema.sql`: 13 tablas normalizadas, claves foráneas, restricciones de unicidad, índices y triggers.
- `002_row_level_security.sql`: Políticas de Row Level Security (RLS) que garantizan que ningún usuario pueda acceder a datos ajenos.

### Tablas Principales:
- `profiles`: Cuentas de usuario.
- `pets`: Perfiles de mascotas (Kira, etc.).
- `user_settings`: Zona horaria, teléfono y preferencias.
- `medications`: Ficha técnica y stock.
- `medication_schedules`: Pautas de dosificación.
- `scheduled_doses`: Tomas programadas concretas.
- `dose_logs`: Historial y auditoría de tomas administradas u omitidas.
- `symptom_logs`: Seguimiento de dolor, movilidad y apetito.
- `vet_visits`: Consultas veterinarias y diagnósticos profesionales.

La base de datos se mantiene limpia y verificada, sin tablas huérfanas ni datos residuales.

---

## 5. Respaldo y Restauración de Datos

- **Exportación en 1 clic**: Desde la sección **Ajustes > Copia de Seguridad**, hacé clic en **Exportar JSON** para descargar un volcado completo de tomas, pautas, observaciones y visitas veterinarias.
- **Resumen Clínico en PDF**: Desde **Salud > Descargar Resumen PDF**, generá un informe profesional que distingue explícitamente entre diagnósticos emitidos por el veterinario y observaciones cotidianas del cuidador.
- **Restablecer datos locales**: Desde **Ajustes > Base de Datos**, podés restablecer la caché del navegador cuando lo necesites.
