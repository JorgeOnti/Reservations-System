# Sistema de Reservas para Negocios

Aplicación web Full-Stack para la gestión de citas y reservas en línea (orientada a barberías, consultorios o talleres). Permite exponer un catálogo de servicios y horarios disponibles por día, reservar citas sin solapamientos con confirmación por correo electrónico (con modo fallback en consola), cancelar mediante enlace seguro con token y administrar las reservas diarias desde un panel del negocio.

---

## Descripción funcional y arquitectura general

El sistema sigue una arquitectura cliente-servidor desacoplada:

- **Backend (`src/Api`):** API REST en ASP.NET Core (.NET 8) con Entity Framework Core y SQLite (`bookings.db`). Al iniciar, crea automáticamente la base de datos (`EnsureCreated`) e inserta datos de ejemplo (`DbSeeder`: 4 servicios activos y horarios laborales de lunes a sábado, domingo cerrado).
- **Frontend (`src/Web`):** SPA en React + TypeScript + Vite con cliente HTTP centralizado (`src/Web/src/api/client.ts`) que consume la API a través de `VITE_API_URL`, sin datos hardcodeados y con estados explícitos de carga, vacío y error.

### Estructura del repositorio

```text
/
├── README.md
├── docs/                 # Espacio reservado para capturas de pantalla
└── src/
    ├── Api/              # Backend ASP.NET Core (.NET 8), EF Core + SQLite
    └── Web/              # Frontend React + TypeScript + Vite + Tailwind CSS
```

### Reglas críticas de negocio

1. **Cálculo de disponibilidad (`GET /api/availability`):**
   - Valida que el servicio exista y esté activo (`404` en caso contrario).
   - Consulta `BusinessHours` para el `DayOfWeek` de la fecha solicitada; si está cerrado (`IsClosed == true`) o no existe registro, retorna `[]` con la cabecera `X-Day-Status: Closed`.
   - Genera bloques candidatos desde `OpenTime` en intervalos regulares (`Business:SlotIntervalMinutes`, por defecto `30` min) siempre que `slotStart + DurationMinutes <= CloseTime`, descartando horarios ya transcurridos si la fecha es hoy.
   - Excluye bloques que se solapen con reservas `Confirmed` usando `slotStart < existingBooking.EndAt && slotEnd > existingBooking.StartAt`.
2. **Prevención de solapamientos y concurrencia (`POST /api/bookings`):**
   - Todas las fechas/horas (`StartAt` y `EndAt`) se normalizan y almacenan en **UTC** en SQLite mediante un `UtcDateTimeConverter`.
   - La validación de horario laboral, cálculo de `EndAt = StartAt.AddMinutes(service.DurationMinutes)`, verificación de solapamientos e inserción se ejecutan dentro de una sección crítica serializada con `SemaphoreSlim` (`BookingGate`) y una transacción de base de datos (`BeginTransactionAsync`). Si existe conflicto, responde `409 Conflict`.
3. **Cancelación segura con token (`POST /api/bookings/{id}/cancel`):**
   - Al crear cada reserva se genera un `CancelToken` criptográficamente seguro (`RandomNumberGenerator.GetBytes(32)` codificado en Base64Url) y se compara en tiempo constante (`CryptographicOperations.FixedTimeEquals`).
   - Al cancelar, el estado cambia a `Cancelled`, liberando inmediatamente el horario en `/api/availability`.

---

## Stack tecnológico

### Backend (`/src/Api`)
- **ASP.NET Core Web API** (`.NET 8.0`)
- **Entity Framework Core** + **SQLite** (`Microsoft.EntityFrameworkCore.Sqlite`)
- **Swashbuckle / Swagger OpenAPI** (habilitado en entorno `Development`)
- **CORS** configurado para `http://localhost:5173` (exponiendo la cabecera `X-Day-Status`)

### Frontend (`/src/Web`)
- **React** (`^19.3.1`) + **TypeScript** (`^7.0.2`)
- **Vite** (`^8.3.8`)
- **React Router DOM** (`^7.18.5`)
- **Tailwind CSS** (`^4.3.5`)

---

## Requisitos previos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (`8.0` o superior)
- [Node.js LTS](https://nodejs.org/) y `npm`

---

## Cómo ejecutar el proyecto en local

### 1. Levantar la API (`/src/Api`)

```bash
cd src/Api
dotnet restore
dotnet run
```

La API quedará escuchando en `http://localhost:5000` (definido en `src/Api/Properties/launchSettings.json`).

- **Swagger UI:** `http://localhost:5000/swagger`
- **Health check:** `http://localhost:5000/api/health`
- La base de datos `src/Api/bookings.db` se crea y siembra automáticamente al arrancar.

### 2. Levantar el Frontend (`/src/Web`)

En otra terminal:

```bash
cd src/Web
npm install
npm run dev
```

El archivo `src/Web/.env` ya incluye la configuración por defecto:

```env
VITE_API_URL=http://localhost:5000
```

La aplicación web estará disponible en `http://localhost:5173`.

> **Nota para compilación de producción:**
> - Backend: `cd src/Api && dotnet build`
> - Frontend: `cd src/Web && npm run build`

---

## Configuración de correo (SMTP y modo fallback en consola)

El servicio `IEmailService` soporta dos modos definidos en `src/Api/appsettings.json` bajo la sección `Smtp`:

```json
"Smtp": {
  "Host": "",
  "Port": 587,
  "User": "",
  "Password": "",
  "From": "",
  "FromName": "Barbería El Clásico",
  "EnableSsl": true
}
```

- **Modo Fallback / Consola (`LoggingEmailService`, por defecto):** Si `Smtp:Host` o `Smtp:From` están vacíos, la API no lanza excepciones ni requiere servidor SMTP; imprime el asunto, destinatario, cuerpo completo del correo y el enlace de cancelación (`http://localhost:5173/cancel/{id}?token={cancelToken}`) directamente en los logs de consola vía `ILogger`.
- **Modo SMTP (`SmtpEmailService`):** Al configurar `Host` y `From` (y opcionalmente `User`, `Password`, `Port` y `EnableSsl`), envía correos reales en formato texto plano y HTML. Se recomienda usar variables de entorno o `dotnet user-secrets` para credenciales reales (por ejemplo `Smtp__Host`, `Smtp__User`, `Smtp__Password`, `Smtp__From`).

### Opciones adicionales de negocio (`src/Api/appsettings.json`)

| Clave | Valor por defecto | Descripción |
| --- | --- | --- |
| `Business:Name` | `"Barbería El Clásico"` | Nombre comercial incluido en los correos |
| `Business:TimeZone` | `""` | Zona horaria IANA/Windows (vacío = zona local del servidor) |
| `Business:SlotIntervalMinutes` | `30` | Intervalo entre bloques candidatos (`0` = duración del servicio) |
| `Business:SharedSchedule` | `false` | `false`: solapamientos por servicio; `true`: agenda compartida única |
| `Frontend:BaseUrl` | `"http://localhost:5173"` | URL base usada para construir el enlace de cancelación |

---

## Endpoints de la API

| Método | Ruta | Parámetros / Body | Descripción y códigos de respuesta |
| --- | --- | --- | --- |
| `GET` | `/api/services` | — | `200 OK`: Lista de servicios activos (`IsActive == true`). |
| `GET` | `/api/availability` | Query: `serviceId`, `date` (`YYYY-MM-DD`) | `200 OK`: Lista de huecos libres (`startAt`, `endAt`, `startTime`, `endTime`, `label`) y cabecera `X-Day-Status` (`Open`, `Closed`, `Past`). `400` si falta o es inválida la fecha; `404` si el servicio no existe o está inactivo. |
| `POST` | `/api/bookings` | Body JSON: `{ serviceId, startAt, customerName, customerEmail, customerPhone }` | `201 Created`: Crea la reserva en estado `Confirmed`, dispara `IEmailService` y devuelve la reserva con `id`, `cancelToken` y `cancelUrl`. `400` por validación/fuera de horario; `404` si el servicio no existe; `409 Conflict` si hay solapamiento. |
| `GET` | `/api/bookings` | Query: `date` (`YYYY-MM-DD`) | `200 OK`: Reservas del día ordenadas cronológicamente con servicio, estado y `cancelToken`. `400` si la fecha es inválida. |
| `POST` | `/api/bookings/{id}/cancel` | Body JSON `{ "token": "..." }` o Query `?token=...` | `200 OK`: Cambia el estado a `Cancelled`, libera el hueco y notifica por `IEmailService`. `400` si falta el token; `403 Forbidden` si el token no coincide; `404` si no existe; `409` si ya estaba cancelada. |
| `GET` | `/api/health` | — | `200 OK`: `{ "status": "Healthy", "timestamp": "..." }`. |

---

## Capturas de pantalla

Las capturas de pantalla de la aplicación se almacenarán en la carpeta [`/docs`](./docs/README.md):

- [Índice de capturas recomendadas](./docs/README.md)
