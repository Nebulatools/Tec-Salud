# Diagrama de Infraestructura - Tec-Salud (EzyAI)

## Topología del Sistema Desplegado

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      TEC-SALUD - INFRASTRUCTURE DIAGRAM                                     │
│                                        https://tec-salud.vercel.app                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                              ┌─────────────────┐
                                              │     CLIENTS     │
                                              └────────┬────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────────────────────┐
                    │                                  │                                  │
                    ▼                                  ▼                                  ▼
          ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
          │     Doctors     │              │    Patients     │              │   Specialists   │
          │   (Dashboard)   │              │   (User View)   │              │    (Doctors)    │
          │                 │              │                 │              │                 │
          │  Web Browser    │              │  Web Browser    │              │  Web Browser    │
          └────────┬────────┘              └────────┬────────┘              └────────┬────────┘
                   │                                │                                │
                   └────────────────────────────────┼────────────────────────────────┘
                                                    │
                                              HTTPS (TLS 1.3)
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           VERCEL EDGE NETWORK                                               │
│                                        (Global CDN - 100+ Locations)                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                         EDGE MIDDLEWARE                                             │   │
│   │  • Request Routing             • Security Headers                                                   │   │
│   │  • Cache Control               • CORS Handling                                                      │   │
│   │  • Static Asset Serving        • Environment Variables                                              │   │
│   └─────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                    │                                                        │
│                          ┌─────────────────────────┼─────────────────────────┐                              │
│                          │                         │                         │                              │
│                          ▼                         ▼                         ▼                              │
│   ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐        │
│   │      STATIC ASSETS          │  │     NEXT.JS APP ROUTER      │  │    API ROUTES (Serverless)  │        │
│   │  ────────────────────────   │  │  ────────────────────────   │  │  ────────────────────────   │        │
│   │  /public/*                  │  │  Server Components (RSC)    │  │  /api/transcribe            │        │
│   │  • Images                   │  │  Client Components          │  │  /api/parse-transcript      │        │
│   │  • Fonts (Archivo,          │  │  ────────────────────────   │  │  /api/enrich-report         │        │
│   │    Brygada 1918)            │  │  /login                     │  │  /api/clinical-extractions  │        │
│   │  • Static files             │  │  /dashboard/*               │  │  /api/medical-reports       │        │
│   │                             │  │  /dashboard/consultas/*     │  │  /api/get-clinical-         │        │
│   │  Cache: Edge optimized      │  │  /dashboard/expedientes/*   │  │       suggestions           │        │
│   └─────────────────────────────┘  │  /dashboard/especialistas/* │  │  /api/virtual-intern        │        │
│                                    │  /user/*                    │  │  ────────────────────────   │        │
│                                    │                             │  │  Serverless Functions       │        │
│                                    │  ISR + Edge Caching         │  │  (Node.js Runtime)          │        │
│                                    └─────────────────────────────┘  └──────────────┬──────────────┘        │
│                                                                                     │                       │
└─────────────────────────────────────────────────────────────────────────────────────┼───────────────────────┘
                                                                                      │
                                                                                      │
                    ┌─────────────────────────────────────────────────────────────────┴─────────────────────┐
                    │                                                                                       │
                    │                              BACKEND SERVICES                                         │
                    │                                                                                       │
                    └───────────┬───────────────────────┬───────────────────────┬───────────────────────────┘
                                │                       │                       │
            ┌───────────────────┴──────────┐           │           ┌───────────┴───────────────────┐
            │                              │           │           │                               │
            ▼                              ▼           ▼           ▼                               ▼
┌───────────────────────┐   ┌───────────────────────────────────────────────┐   ┌───────────────────────┐
│   AUTHENTICATION      │   │              DATABASE                         │   │   AI / ML SERVICES    │
│   ────────────────    │   │   ────────────────────────────────────────    │   │   ────────────────    │
│                       │   │                                               │   │                       │
│   ┌───────────────┐   │   │   ┌───────────────────────────────────────┐   │   │   ┌───────────────┐   │
│   │ Supabase Auth │   │   │   │         Supabase PostgreSQL           │   │   │   │ Google Gemini │   │
│   │  ───────────  │   │   │   │  ─────────────────────────────────    │   │   │   │  ───────────  │   │
│   │  • JWT Tokens │   │   │   │  Project: didbxinquugseweufvpr        │   │   │   │  Model:       │   │
│   │  • Sessions   │   │   │   │                                       │   │   │   │  gemini-1.5-  │   │
│   │  • Email/Pass │   │   │   │  Tables:                              │   │   │   │  flash/pro    │   │
│   │               │   │   │   │  ┌─────────────────────────────────┐  │   │   │   │               │   │
│   │  Roles:       │   │   │   │  │ doctors                        │  │   │   │   │  Features:    │   │
│   │  • doctor     │   │   │   │  │ patients                       │  │   │   │   │  • Audio      │   │
│   │  • user       │   │   │   │  │ appointments                   │  │   │   │   │    Transcribe │   │
│   │  (paciente)   │   │   │   │  │ medical_reports                │  │   │   │   │  • Clinical   │   │
│   │               │   │   │   │  │ clinical_extractions           │  │   │   │   │    Extraction │   │
│   │  RLS Policy   │   │   │   │  │ app_users                      │  │   │   │   │  • Report     │   │
│   │  Enabled      │   │   │   │  └─────────────────────────────────┘  │   │   │   │    Enrichment │   │
│   └───────────────┘   │   │   │                                       │   │   │   │  • Compliance │   │
│                       │   │   │  Features:                            │   │   │   │    Check      │   │
└───────────────────────┘   │   │  • Row Level Security (RLS)           │   │   │   └───────────────┘   │
                            │   │  • Real-time subscriptions            │   │   │                       │
                            │   │  • Auto-generated APIs                │   │   │   ┌───────────────┐   │
                            │   │  • Storage (for PDFs/images)          │   │   │   │   OpenAI API  │   │
                            │   └───────────────────────────────────────┘   │   │   │  ───────────  │   │
                            │                                               │   │   │  Model:       │   │
                            └───────────────────────────────────────────────┘   │   │  gpt-4o-mini  │   │
                                                                                │   │               │   │
                                                                                │   │  Feature:     │   │
                                                                                │   │  • Virtual    │   │
                                                                                │   │    Intern     │   │
                                                                                │   │    (Clinical  │   │
                                                                                │   │    Analysis)  │   │
                                                                                │   └───────────────┘   │
                                                                                │                       │
                                                                                └───────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            DATA FLOW DIAGRAM                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│                                        CONSULTATION FLOW (5 STEPS)                                          │
│                                                                                                             │
│     ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐                   │
│     │  Step 1  │─────▶│  Step 2  │─────▶│  Step 3  │─────▶│  Step 4  │─────▶│  Step 5  │                   │
│     │ Patient  │      │  Audio   │      │  Parse   │      │ Enrich   │      │  Final   │                   │
│     │ Summary  │      │Recording │      │Transcript│      │ Report   │      │ Report   │                   │
│     └──────────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘                   │
│                            │                 │                 │                 │                         │
│                            ▼                 ▼                 ▼                 ▼                         │
│                     ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐                   │
│                     │  Gemini    │    │  Gemini    │    │  Gemini    │    │  Supabase  │                   │
│                     │ Transcribe │    │  Extract   │    │  Enrich    │    │   Save     │                   │
│                     └────────────┘    └────────────┘    └────────────┘    └────────────┘                   │
│                                                                                                             │
│  ─────────────────────────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                                             │
│                                         GENERAL DATA FLOW                                                   │
│                                                                                                             │
│     ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐                   │
│     │  Client  │─────▶│  Vercel  │─────▶│  API     │─────▶│ Supabase │◀────▶│  AI APIs │                   │
│     │ (Doctor/ │◀─────│  Edge    │◀─────│  Routes  │◀─────│PostgreSQL│      │ (Gemini/ │                   │
│     │ Patient) │      │          │      │          │      │          │      │  OpenAI) │                   │
│     └──────────┘      └──────────┘      └──────────┘      └──────────┘      └──────────┘                   │
│           │                                   │                                   │                         │
│           │                                   │                                   │                         │
│           │                                   ▼                                   │                         │
│           │                          ┌───────────────┐                            │                         │
│           │                          │ Supabase Auth │                            │                         │
│           │                          │  (Sessions)   │                            │                         │
│           │                          └───────────────┘                            │                         │
│           │                                                                       │                         │
│           └───────────────────────────────────────────────────────────────────────┘                         │
│                                   (AI-powered analysis & suggestions)                                       │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         TECHNOLOGY STACK SUMMARY                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│   FRONTEND                    │   BACKEND                     │   INFRASTRUCTURE                            │
│   ─────────────────────────   │   ─────────────────────────   │   ─────────────────────────                 │
│   • Next.js 16.0.10           │   • Node.js (Serverless)      │   • Vercel (Platform)                       │
│   • React 19                  │   • Supabase                  │   • Supabase (PostgreSQL)                   │
│   • TypeScript 5              │   • PostgreSQL                │   • Vercel Edge Network (CDN)               │
│   • Tailwind CSS 3.4          │   • Row Level Security        │   • GitHub Actions (CI/CD)                  │
│   • shadcn/ui + Radix UI      │   • Google Gemini AI          │                                             │
│   • React Hook Form           │   • OpenAI API                │   AI SERVICES                               │
│   • Zod (Validation)          │   • JWT Authentication        │   ─────────────────────────                 │
│   • Recharts (Charts)         │                               │   • Google Gemini (Transcription)           │
│   • Lucide React (Icons)      │                               │   • Google Gemini (Clinical Extract)        │
│   • next-themes               │                               │   • OpenAI GPT-4o-mini (Virtual Intern)     │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           SECURITY LAYERS                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│   Layer 1: Network          │   Layer 2: Application         │   Layer 3: Data                             │
│   ─────────────────────     │   ─────────────────────────    │   ─────────────────────────                 │
│   • TLS 1.3 Encryption      │   • Supabase JWT Auth          │   • Row Level Security (RLS)                │
│   • Vercel DDoS Protection  │   • Role-Based Access          │   • Data Isolation by Doctor                │
│   • Security Headers        │   • Input Validation (Zod)     │   • Service Role Key (Server)               │
│   • CORS Policy             │   • Protected Routes           │   • Anon Key (Client-safe)                  │
│                             │   • Session Management         │   • PostgreSQL Policies                     │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              LEGEND                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                             │
│   ──────▶  Data Flow (Request/Response)                                                                     │
│   ◀─────▶  Bidirectional Communication                                                                      │
│   ┌─────┐  Service/Component                                                                                │
│   │     │                                                                                                   │
│   └─────┘                                                                                                   │
│                                                                                                             │
│   Production URL: https://tec-salud.vercel.app                                                              │
│   Platform: Vercel                                                                                          │
│   Database: Supabase (PostgreSQL)                                                                           │
│   AI Providers: Google Gemini, OpenAI                                                                       │
│                                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Descripcion de Componentes

### 1. Capa de Clientes
- **Doctors (Dashboard)**: Medicos que acceden al panel de gestion de consultas, expedientes y reportes
- **Patients (User View)**: Pacientes que acceden a su perfil, cuestionarios y especialistas
- **Specialists**: Medicos especialistas visibles en el marketplace

### 2. Vercel Edge Network
- **CDN Global**: Distribucion de contenido estatico en 100+ ubicaciones
- **Edge Middleware**: Procesamiento de seguridad y routing
- **Static Assets**: Imagenes, fuentes (Archivo, Brygada 1918)
- **Next.js App Router**: Server/Client Components con ISR
- **API Routes Serverless**: Funciones para transcripcion, extraccion y analisis

### 3. Servicios Backend

#### Supabase Auth
- Autenticacion JWT con email/password
- Roles: doctor (admin) y user (paciente)
- Sesiones gestionadas automaticamente
- Row Level Security para aislamiento de datos

#### Supabase PostgreSQL
- **doctors**: Perfiles de medicos
- **patients**: Expedientes de pacientes
- **appointments**: Citas programadas
- **medical_reports**: Reportes clinicos generados
- **clinical_extractions**: Datos extraidos por IA
- **app_users**: Usuarios con roles

### 4. Servicios de IA

#### Google Gemini
| Endpoint | Modelo | Funcion |
|----------|--------|---------|
| `/api/transcribe` | gemini-1.5-flash | Transcripcion de audio a texto |
| `/api/parse-transcript` | gemini-1.5-pro | Extraccion de sintomas, diagnosticos, medicamentos |
| `/api/enrich-report` | gemini-1.5-pro | Validacion de cumplimiento normativo |
| `/api/get-clinical-suggestions` | gemini-1.5-pro | Sugerencias clinicas |

#### OpenAI
| Endpoint | Modelo | Funcion |
|----------|--------|---------|
| `/api/virtual-intern` | gpt-4o-mini | Pasante virtual para analisis clinico |

### 5. Flujo de Consulta (5 Pasos)

1. **Patient Summary**: Resumen del expediente del paciente
2. **Audio Recording**: Grabacion de la consulta medica
3. **Parse Transcript**: Transcripcion y extraccion de datos clinicos (Gemini)
4. **Enrich Report**: Enriquecimiento con cumplimiento normativo (Gemini)
5. **Final Report**: Verificacion y guardado en base de datos

### 6. Seguridad Implementada

| Capa | Tecnologia | Descripcion |
|------|------------|-------------|
| Network | TLS 1.3 | Encriptacion en transito |
| Network | Vercel DDoS | Proteccion contra ataques |
| Application | Supabase JWT | Autenticacion basada en tokens |
| Application | Zod | Validacion de entrada de datos |
| Data | RLS | Row Level Security en PostgreSQL |
| Data | Service Role | Key privada solo en servidor |

---

## Stack Tecnologico Detectado

| Capa | Tecnologias |
|------|-------------|
| Frontend | Next.js 16.0.10, React 19, TypeScript, Tailwind CSS, shadcn/ui, Radix UI |
| Backend | Node.js Serverless, Supabase, PostgreSQL |
| IA | Google Gemini (gemini-1.5-flash/pro), OpenAI (gpt-4o-mini) |
| Base de Datos | Supabase PostgreSQL con RLS |
| Deploy | Vercel (Edge Functions, CDN global) |
| Testing | Vitest, Playwright, MSW |
| CI/CD | GitHub Actions |

---

*Documento generado el 18 de Diciembre de 2024*
*Tec-Salud (EzyAI) - Plataforma Medica con IA*
