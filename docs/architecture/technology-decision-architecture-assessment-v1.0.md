# Technology Decision & Architecture Assessment v1.0

## Closet AI — Personal Wardrobe Intelligence Platform

**Versión:** 1.0  
**Fecha:** 23 de agosto de 2026  
**Estado:** Baseline tecnológico aprobado para iniciar diseño detallado e implementación  
**Documentos de entrada:** Project Definition v1.0 + PRD v1.0  
**Usuarios iniciales:** 2  
**Principio rector:** Self-hosted first, cloud-portable, maintainability first

---

## 1. Objetivo

Este documento consolida las decisiones tecnológicas y arquitectónicas iniciales de Closet AI.

Las decisiones priorizan:

1. mantenibilidad;
2. velocidad de desarrollo;
3. claridad de dominio;
4. robustez;
5. bajo costo para dos usuarios;
6. facilidad para que otro desarrollador pueda incorporarse;
7. integración sencilla con IA;
8. independencia de proveedores cloud no esenciales;
9. portabilidad entre servidor doméstico y una VM/VPS futura.

Closet AI no se diseñará para escala masiva durante el MVP. La complejidad principal reside en el dominio, el ciclo de vida del guardarropa, las integraciones y la inteligencia artificial.

---

## 2. Principios arquitectónicos

### 2.1 Modular Monolith First

El backend se implementará inicialmente como un **modular monolith**.

No se introducirán microservicios sin una necesidad técnica demostrada.

### 2.2 API First

Flutter, Alexa, Telegram y futuros clientes consumirán el mismo núcleo mediante contratos explícitos.

### 2.3 Domain-oriented

Las reglas de negocio no deberán residir en controllers, adapters externos ni prompts.

Arquitectura conceptual:

```text
Interfaces
    ↓
Application
    ↓
Domain
    ↓
Ports
    ↓
Infrastructure
```

### 2.4 Database as Source of Truth

PostgreSQL será la fuente persistente de verdad.

La IA nunca tendrá autoridad directa sobre la base de datos.

### 2.5 AI as an Adapter

OpenAI será un proveedor del sistema, no el dominio.

### 2.6 Maintainability First

El código deberá poder ser entendido y modificado por otro desarrollador sin depender del contexto histórico de quien lo creó.

### 2.7 Self-hosted First / Cloud Portable

El sistema completo deberá poder ejecutarse en una sola máquina Linux mediante contenedores.

AWS no será una dependencia arquitectónica.

---

# 3. Resumen de decisiones

| DEC | Área | Decisión | Estado |
|---|---|---|---|
| DEC-001 | Backend | TypeScript + NestJS | Aprobada |
| DEC-002 | Frontend | Flutter + Dart | Aprobada |
| DEC-003 | Database | PostgreSQL | Aprobada |
| DEC-004 | ORM / Data Access | Prisma | Aprobada |
| DEC-005 | Authentication | NestJS + Argon2id + JWT + rotating refresh tokens | Aprobada |
| DEC-006 | Object Storage | Local filesystem abstraction; R2 opcional para backup | Aprobada / revisada |
| DEC-007 | AI Provider | OpenAI para LLM/Vision | Aprobada |
| DEC-008 | Outfit Visualization | Outfit completo generado con IA | Aprobada |
| DEC-009 | Weather | Open-Meteo | Aprobada |
| DEC-010 | Background Jobs | BullMQ + Redis | Aprobada |
| DEC-011 | Hosting | Single-host, self-hosted first, cloud-portable | Aprobada |
| DEC-012 | Observability | Pino + OpenTelemetry + Prometheus/Grafana | Aprobada |
| DEC-013 | CI/CD | GitHub Actions + GHCR + controlled deployment | Aprobada |
| DEC-014 | Containerization | Docker + Docker Compose | Aprobada |
| DEC-015 | Reverse Proxy / HTTPS | Caddy; tunnel sólo si es necesario | Aprobada |
| DEC-016 | Backup | PostgreSQL backup + Restic + copia externa | Aprobada |
| DEC-017 | Secrets | Host/Docker secrets + `.env` sólo para configuración local | Aprobada |
| DEC-018 | Testing | Vitest + Supertest + Testcontainers + Flutter tests | Aprobada |
| DEC-019 | Repository | Monorepo simple; pnpm para TS; Flutter nativo | Aprobada |
| DEC-020 | API | REST + JSON + OpenAPI 3.1 + `/api/v1` | Aprobada |

---

# 4. DEC-001 — Backend

## Decisión

```text
TypeScript
NestJS
```

## Razones

- experiencia fuerte del desarrollador principal en JavaScript/TypeScript;
- alta productividad;
- arquitectura modular;
- dependency injection;
- testing;
- integración natural con APIs JSON;
- ecosistema adecuado para OpenAI, Telegram y Alexa;
- incorporación relativamente sencilla de nuevos desarrolladores.

## Restricción

NestJS es el framework de aplicación, pero no representa el dominio.

Evitar:

```text
Controller → Prisma
Controller → OpenAI
```

Preferir:

```text
Controller
   ↓
Use Case
   ↓
Domain
   ↓
Port
   ↓
Adapter
```

---

# 5. DEC-002 — Frontend

## Decisión

```text
Flutter
Dart
```

## Plataformas prioritarias

1. iPadOS;
2. iOS;
3. macOS/web como posibles extensiones.

## Razones

Closet AI se utilizará principalmente dentro de un ecosistema Apple.

Flutter ofrece:

- aplicación instalable;
- excelente experiencia tablet;
- cámara e imágenes;
- notificaciones;
- almacenamiento local seguro;
- una única aplicación para iPhone/iPad;
- control visual apropiado para un producto de moda.

No se creará un segundo frontend React/Next.js durante el MVP salvo necesidad demostrada.

---

# 6. DEC-003 — Database

## Decisión

```text
PostgreSQL
```

## Razones

El dominio es altamente relacional:

```text
USER 1:N GARMENT
USER 1:N OUTFIT
OUTFIT N:M GARMENT
GARMENT 1:N USAGE_EVENT
GARMENT 1:N WASH_EVENT
```

PostgreSQL proporciona:

- ACID;
- foreign keys;
- constraints;
- transacciones;
- índices;
- JSONB cuando esté justificado;
- portabilidad;
- madurez.

---

# 7. DEC-004 — ORM / Data Access

## Decisión

```text
Prisma ORM
```

## Reglas

Prisma permanecerá detrás de repositories/adapters.

```text
Application
    ↓
Repository Port
    ↓
Prisma Repository
    ↓
PostgreSQL
```

Los modelos Prisma representan persistencia y no necesariamente son idénticos a entidades del dominio.

Todas las modificaciones de schema deberán versionarse mediante migraciones.

---

# 8. DEC-005 — Authentication & Authorization

## Decisión

Autenticación propia mediante NestJS.

```text
Password hashing: Argon2id
Access Token: JWT ~15 minutos
Refresh Token: rotativo
Refresh Token persistence: hash por sesión
Reuse detection: sí
Client secure storage: iOS Keychain
```

## Modelo

```text
User
 ├── Credentials
 ├── AuthSession[]
 └── ExternalIdentity[]
```

## AuthSession

Debe permitir:

- varias sesiones por usuario;
- expiración;
- revocación;
- rotación;
- logout por dispositivo;
- logout global.

Los refresh tokens no se almacenarán en texto plano.

## ExternalIdentity

Permitirá enlazar en el futuro:

```text
ALEXA
TELEGRAM
APPLE
```

con un `User` interno.

---

# 9. DEC-006 — Object Storage

## Decisión revisada

El almacenamiento primario de imágenes será **local al servidor** detrás de una abstracción de almacenamiento.

```text
ObjectStoragePort
       ↓
LocalObjectStorageAdapter
       ↓
Persistent filesystem
```

Cloudflare R2 deja de ser una dependencia operacional.

Podrá utilizarse posteriormente como:

```text
off-site encrypted backup
```

o como implementación alternativa del mismo puerto.

## Razones

- sólo dos usuarios;
- self-hosted first;
- minimizar dependencias externas;
- evitar costo recurrente innecesario;
- fotografías accesibles incluso ante caída de un proveedor cloud.

## Estructura conceptual

```text
/data/closet-ai/objects/
  households/
    {householdId}/
      users/
        {userId}/
          garments/
          outfits/
```

La base de datos almacenará `object_key`, no rutas públicas permanentes.

## Seguridad

El directorio de objetos no se expondrá directamente a Internet.

El acceso será autorizado por el backend.

---

# 10. DEC-007 — AI Provider

## Decisión

```text
OpenAI
```

como proveedor principal de:

- LLM;
- Vision;
- interpretación de lenguaje natural;
- Style Profiler;
- Garment Analyzer;
- Outfit Stylist;
- Laundry Advisor futuro;
- Shopping Advisor futuro.

## Arquitectura

No existirá un `AIService.generate(prompt)` universal.

Se utilizarán puertos semánticos:

```text
StyleProfilerPort
GarmentAnalyzerPort
OutfitStylistPort
LaundryAdvisorPort
ShoppingAdvisorPort
```

## Structured Outputs

Las respuestas consumidas programáticamente deberán validarse contra schemas.

La IA sólo podrá seleccionar `garmentIds` proporcionados previamente por el backend.

## Modelo configurable

Los nombres de modelos deberán vivir en configuración:

```text
AI_OUTFIT_MODEL
AI_VISION_MODEL
AI_STYLE_MODEL
AI_IMAGE_MODEL
```

y no dispersos por el código.

---

# 11. DEC-008 — Outfit Image Generation

## Decisión

El outfit completo será generado visualmente mediante IA.

## Regla fundamental

```text
Domain truth = Outfit + garmentIds
Visual = representación derivada
```

La imagen no es fuente de verdad.

## Flujo

```text
Recommendation Engine
       ↓
Persist Outfit
       ↓
Persist Visual=PENDING
       ↓
BullMQ
       ↓
AI Image Generation
       ↓
Local Object Storage
       ↓
Visual=READY
```

Si la generación falla, el outfit textual seguirá siendo completamente funcional.

## MVP

Se priorizará una presentación consistente tipo:

```text
MANNEQUIN
```

antes de implementar try-on hiperrealista personalizado.

---

# 12. DEC-009 — Weather Provider

## Decisión

```text
Open-Meteo
```

## Razones

Para el uso inicial personal:

- no requiere API key;
- no requiere registro;
- el free tier está orientado a uso no comercial;
- capacidad muy superior a las necesidades de dos usuarios;
- API JSON sencilla;
- permite mantener bajo el costo del sistema.

## Arquitectura

```text
WeatherPort
    ↓
OpenMeteoAdapter
```

El dominio no dependerá directamente del proveedor.

## Cache

Las respuestas meteorológicas podrán cachearse temporalmente en Redis para evitar consultas innecesarias.

## Evolución

Si Closet AI se comercializa, deberán revisarse términos/licencia y podrá cambiarse al plan comercial o a otro proveedor sin modificar el dominio.

---

# 13. DEC-010 — Background Jobs

## Decisión

```text
BullMQ
Redis
```

## Procesos iniciales

```text
outfit.generate-visual
garment.analyze-image
notification.telegram.send
storage.cleanup-object
```

## Procesos separados

```text
NestJS API
NestJS Worker
```

podrán ejecutarse como contenedores diferentes dentro del mismo modular monolith.

Redis no será fuente de verdad.

## Reglas

- jobs idempotentes;
- payloads pequeños;
- persistir estado antes de enqueue;
- exponential backoff para fallos transitorios;
- estado funcional persistido en PostgreSQL;
- failed jobs observables.

---

# 14. DEC-011 — Hosting / Infrastructure

## Decisión

```text
Single-host architecture
Self-hosted first
Cloud-portable
```

El objetivo de producción es poder ejecutar Closet AI en un servidor doméstico Linux.

La aplicación no dependerá de servicios administrados AWS.

## Topología

```text
Linux Server
│
├── Caddy
├── NestJS API
├── NestJS Worker
├── PostgreSQL
├── Redis
├── Object Storage
├── Prometheus
└── Grafana
```

## Hardware baseline

No se requiere GPU porque la IA vive en OpenAI.

Baseline recomendado para futura compra:

```text
CPU: 4+ cores modernos
RAM: 16 GB
Storage: 512 GB NVMe mínimo; 1 TB preferible
Network: Gigabit Ethernet
Architecture: x86_64 preferida
OS: Ubuntu Server LTS
GPU: no requerida
```

## Importante

La compra de hardware se decidirá mediante un TCO independiente comparando:

```text
Home server
vs
single cloud VM/VPS
```

a 1, 3 y 5 años.

Aunque el servidor doméstico sea el target primario, la misma aplicación deberá poder desplegarse en una VM Linux sin reescritura.

---

# 15. DEC-012 — Observability

## Decisión

### Logs

```text
Pino
structured JSON logging
```

### Telemetría

```text
OpenTelemetry
```

### Métricas

```text
Prometheus
```

### Dashboards

```text
Grafana
```

Todo podrá ejecutarse localmente.

## Loki

Loki se deja fuera del MVP inicial.

Podrá incorporarse si consultar logs únicamente desde Docker/host se vuelve insuficiente.

## Métricas mínimas

```text
HTTP latency
HTTP errors
queue depth
failed jobs
PostgreSQL health
Redis health
OpenAI latency
OpenAI calls
OpenAI errors
AI token usage
estimated AI cost
```

## Correlation

Toda operación relevante deberá poder enlazar:

```text
requestId
correlationId
userId
outfitId
jobId
aiExecutionId
```

sin registrar secretos.

---

# 16. DEC-013 — CI/CD

## Decisión

```text
GitHub Actions
GitHub Container Registry (GHCR)
```

## Pipeline

```text
checkout
↓
install
↓
lint
↓
typecheck
↓
unit tests
↓
integration tests
↓
build
↓
Docker image build
↓
security/dependency checks
↓
push image to GHCR
```

## Producción

El despliegue al servidor deberá ser controlado.

Primera estrategia:

```text
release/tag
↓
GitHub Actions
↓
GHCR
↓
server pulls versioned images
↓
docker compose up -d
```

No se desplegará automáticamente cada commit a producción.

---

# 17. DEC-014 — Containerization

## Decisión

```text
Docker
Docker Compose
```

## Objetivo

El mismo conjunto de servicios deberá funcionar en:

- Mac de desarrollo;
- servidor doméstico;
- VPS;
- VM cloud.

## Servicios conceptuales

```yaml
services:
  caddy:
  api:
  worker:
  postgres:
  redis:
  prometheus:
  grafana:
```

El object storage local se montará mediante volumen persistente.

## No Kubernetes

Kubernetes queda explícitamente fuera del MVP.

---

# 18. DEC-015 — Reverse Proxy / HTTPS / External Access

## Decisión

```text
Caddy
```

como reverse proxy y terminación TLS.

## Razones

- configuración pequeña;
- HTTPS automático;
- renovación automática de certificados;
- reverse proxy sencillo;
- apropiado para single-host.

## Acceso público

Si el hogar dispone de IP pública y port forwarding adecuado:

```text
Internet
  ↓
Caddy :443
  ↓
NestJS API
```

Si existe CGNAT o no es viable exponer puertos, se podrá introducir un tunnel externo como mecanismo de ingress.

El tunnel será una **opción de infraestructura**, no una dependencia del dominio.

## Seguridad

Nunca se expondrán directamente:

```text
PostgreSQL
Redis
Grafana admin
filesystem
```

a Internet.

---

# 19. DEC-016 — Backup Strategy

## Decisión

Se implementará una estrategia separada para datos y objetos.

### PostgreSQL

Backup periódico mediante herramientas nativas (`pg_dump` inicialmente).

### Files / object storage

```text
Restic
```

para snapshots cifrados, incrementales y deduplicados.

## Destinos

Mínimo:

```text
Servidor
+
medio físico separado
```

Recomendado posteriormente:

```text
+
off-site encrypted backup
```

El backup off-site podrá utilizar Cloudflare R2 u otro storage económico, pero será opcional.

## Regla

Un backup en el mismo SSD del servidor no cuenta como backup.

## Frecuencia inicial

```text
PostgreSQL: diaria
Object storage: diaria
Configuration: en cada cambio relevante
```

La política podrá ajustarse cuando existan datos reales.

---

# 20. DEC-017 — Secrets & Configuration

## Decisión

Separación estricta entre configuración y secretos.

### Desarrollo local

`.env` permitido exclusivamente fuera de Git.

### Producción

Secretos almacenados como archivos protegidos en el host y montados mediante Docker/Compose secrets cuando corresponda.

Ejemplos:

```text
OPENAI_API_KEY
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
DATABASE_PASSWORD
TELEGRAM_BOT_TOKEN
```

## Reglas

- ningún secreto en Git;
- ningún secreto en Docker images;
- ningún token completo en logs;
- `.env.example` sólo contendrá nombres y valores ficticios;
- rotación posible sin recompilar la aplicación.

SOPS/age o un secret manager podrán evaluarse en el futuro si el proyecto crece.

---

# 21. DEC-018 — Testing Strategy

## Backend

```text
Vitest
Supertest
Testcontainers
```

### Unit Tests

Dominio y application services.

### Integration Tests

PostgreSQL, Prisma, Redis y adapters principales utilizando entornos desechables.

### API / E2E

Supertest.

## Flutter

```text
flutter_test
integration_test
```

## IA

Las pruebas normales no deberán llamar a OpenAI.

Se utilizarán:

```text
FakeOutfitStylist
FakeGarmentAnalyzer
FakeImageGenerator
```

### AI Contract Tests

Validarán schemas, IDs, rangos y fallbacks.

### AI Evaluation Suite

Será un conjunto separado y opt-in que sí podrá realizar llamadas reales a OpenAI para evaluar calidad y costo.

---

# 22. DEC-019 — Repository Strategy

## Decisión

Un único monorepo.

No se introducirá Nx ni Turborepo inicialmente porque el repositorio combina TypeScript y Dart y no existe una necesidad que justifique otra capa de tooling.

## Estructura propuesta

```text
closet-ai/
├── AGENTS.md
├── README.md
├── apps/
│   ├── api/
│   ├── worker/
│   └── mobile/
├── packages/
│   ├── domain/
│   ├── application/
│   └── shared/
├── docs/
│   ├── project/
│   ├── architecture/
│   ├── domain/
│   ├── api/
│   └── adr/
├── prompts/
├── infrastructure/
│   ├── docker/
│   ├── caddy/
│   ├── prometheus/
│   └── backup/
├── prisma/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env.example
```

## Tooling

TypeScript:

```text
pnpm workspaces
```

Flutter:

```text
Flutter tooling nativo
```

La orquestación global podrá realizarse mediante scripts de raíz o `Makefile`/`Taskfile` si se vuelve útil.

---

# 23. DEC-020 — API Style

## Decisión

```text
REST
JSON
OpenAPI 3.1
/api/v1
```

## Razones

- dominio orientado a recursos/casos de uso;
- integración sencilla con Flutter;
- integración sencilla con Alexa/Telegram;
- contracts fáciles de documentar;
- no existe necesidad demostrada de GraphQL.

## Ejemplos

```text
POST /api/v1/auth/login

GET  /api/v1/garments
POST /api/v1/garments
GET  /api/v1/garments/{id}

POST /api/v1/outfit-recommendations
POST /api/v1/outfits/{id}/select
POST /api/v1/outfits/{id}/confirm-usage

POST /api/v1/outfits/{id}/feedback
```

NestJS generará documentación OpenAPI.

Los contratos serán utilizados como referencia para Flutter y futuros clientes.

---

# 24. Arquitectura consolidada

```text
                         ┌──────────────────┐
                         │      OpenAI      │
                         │ LLM/Vision/Image │
                         └────────▲─────────┘
                                  │
                             HTTPS│
                                  │
┌─────────────────────────────────┼─────────────────────────────────┐
│                         HOME SERVER                               │
│                                                                   │
│  Internet                                                         │
│     │                                                             │
│     ▼                                                             │
│  ┌───────┐                                                        │
│  │ Caddy │                                                        │
│  └───┬───┘                                                        │
│      │                                                            │
│  ┌───▼─────────┐                                                  │
│  │ NestJS API  │                                                  │
│  └───┬─────────┘                                                  │
│      │                                                            │
│      ├─────────────┬─────────────┬───────────────┐                │
│      │             │             │               │                │
│      ▼             ▼             ▼               ▼                │
│ PostgreSQL       Redis      Local Objects    BullMQ Producer       │
│                    │                                │               │
│                    └──────────────┬─────────────────┘               │
│                                   ▼                                 │
│                             ┌────────────┐                           │
│                             │  Worker    │                           │
│                             │  NestJS    │                           │
│                             └────────────┘                           │
│                                                                   │
│  ┌────────────┐       ┌────────────┐                               │
│  │ Prometheus │──────▶│  Grafana   │                               │
│  └────────────┘       └────────────┘                               │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

            ▲                       ▲
            │ HTTPS                 │ HTTPS
            │                       │
       ┌────┴─────┐           ┌─────┴─────────┐
       │ Flutter  │           │ Alexa/Telegram│
       │ iPhone/  │           │    futuro     │
       │ iPad     │           └───────────────┘
       └──────────┘
```

---

# 25. Fuente de verdad por componente

| Información | Fuente de verdad |
|---|---|
| Usuarios | PostgreSQL |
| Sesiones | PostgreSQL |
| Prendas | PostgreSQL |
| Estado de prenda | PostgreSQL |
| Outfits | PostgreSQL |
| Historial | PostgreSQL |
| Jobs | BullMQ/Redis sólo operacionalmente |
| Imágenes | Filesystem persistente + metadata PostgreSQL |
| Recomendación IA | Persistida después de validación |
| Perfil estilístico | PostgreSQL |
| Logs | Host/runtime |
| Métricas | Prometheus |
| Secrets | Host seguro |

---

# 26. Dependencias externas obligatorias del Core

Inicialmente la única dependencia cloud imprescindible para capacidades inteligentes será:

```text
OpenAI
```

El resto del Core podrá ejecutarse localmente.

Open-Meteo será una integración externa gratuita y reemplazable cuando se habilite clima automático.

Alexa y Telegram serán integraciones opcionales posteriores.

---

# 27. Tecnologías explícitamente fuera del MVP

No introducir:

```text
Kubernetes
Kafka
RabbitMQ
Event Sourcing
Distributed CQRS
Vector Database
Fine Tuning
Self-hosted LLM
GPU server
Microservices
RDS
ElastiCache
EKS
ECS
GraphQL
Nx
Turborepo
```

salvo que un requisito futuro justifique explícitamente reconsiderarlas.

---

# 28. ADRs derivados

A partir de este documento deberán crearse ADR individuales cuando comience el bootstrap:

```text
ADR-001-modular-monolith.md
ADR-002-typescript-nestjs-backend.md
ADR-003-flutter-client.md
ADR-004-postgresql.md
ADR-005-prisma.md
ADR-006-custom-jwt-authentication.md
ADR-007-local-object-storage.md
ADR-008-openai-primary-ai-provider.md
ADR-009-ai-generated-outfit-visualization.md
ADR-010-bullmq-redis-background-jobs.md
ADR-011-self-hosted-single-host-deployment.md
ADR-012-observability-stack.md
ADR-013-github-actions-ci-cd.md
ADR-014-docker-compose.md
ADR-015-caddy-ingress.md
ADR-016-backup-strategy.md
ADR-017-secrets-strategy.md
ADR-018-testing-strategy.md
ADR-019-monorepo.md
ADR-020-rest-openapi.md
```

---

# 29. Decisiones aplazadas intencionalmente

Estas decisiones no bloquean el desarrollo:

## Hardware exacto

Se definirá mediante TCO y benchmarking después de completar el diseño de infraestructura.

## Proveedor de backup off-site

R2 es candidato, pero no es obligatorio.

## Tunnel externo

Sólo se decidirá cuando se conozca la conectividad del domicilio (IP pública/CGNAT).

## Modelo específico de OpenAI

Los modelos estarán parametrizados para permitir evolución.

## Apple Sign In

No forma parte del MVP inicial.

## WebSockets / SSE

Se utilizará inicialmente polling para estados asíncronos si es suficiente.

---

# 30. Siguiente fase

Con este Technology Decision & Architecture Assessment cerrado, el proyecto deberá avanzar en el siguiente orden:

```text
1. Crear AGENTS.md para Codex
2. Crear ADRs
3. Domain Model v1
4. Garment / Outfit state machines
5. Database Model / ERD
6. Prisma schema inicial
7. OpenAPI Contract v1
8. MVP Backlog
9. Repository bootstrap
10. Primer vertical slice sin IA
11. Integración OpenAI
```

El primer vertical slice deberá demostrar:

```text
Create Household/User
        ↓
Create Garments
        ↓
List Available Garments
        ↓
Generate Basic Outfit
        ↓
Select Outfit
        ↓
Confirm Usage
        ↓
Create Usage Events
```

La IA no deberá incorporarse hasta que este flujo básico de dominio sea funcional y esté probado.

---

# 31. Criterio de modificación futura

Una decisión de este documento podrá cambiar cuando:

1. exista un requisito nuevo;
2. la tecnología elegida ya no satisfaga el requisito;
3. exista una ventaja objetiva suficiente para asumir el costo de migración.

Todo cambio relevante deberá quedar documentado mediante ADR.

---

**Fin — Technology Decision & Architecture Assessment v1.0**
