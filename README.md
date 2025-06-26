# 🏥 EzyAI - Sistema de Gestión Médica

> Un sistema completo de gestión médica desarrollado con Next.js 15, React 19, Supabase y Google Gemini AI para transcripción de consultas médicas.

## 📋 Tabla de Contenidos

- [🏥 EzyAI - Sistema de Gestión Médica](#-ezyai---sistema-de-gestión-médica)
  - [📋 Tabla de Contenidos](#-tabla-de-contenidos)
  - [✨ Características Principales](#-características-principales)
  - [🛠️ Tecnologías Utilizadas](#️-tecnologías-utilizadas)
  - [🚀 Instalación y Configuración](#-instalación-y-configuración)
    - [Requisitos Previos](#requisitos-previos)
    - [1. Clonar el Repositorio](#1-clonar-el-repositorio)
    - [2. Instalar Dependencias](#2-instalar-dependencias)
    - [3. Configurar Variables de Entorno](#3-configurar-variables-de-entorno)
    - [4. Configurar Base de Datos Supabase](#4-configurar-base-de-datos-supabase)
    - [5. Ejecutar la Aplicación](#5-ejecutar-la-aplicación)
  - [🔑 Variables de Entorno (.env.local)](#-variables-de-entorno-envlocal)
  - [📊 Base de Datos](#-base-de-datos)
  - [🎯 Funcionalidades Detalladas](#-funcionalidades-detalladas)
    - [🔐 Sistema de Autenticación](#-sistema-de-autenticación)
    - [📊 Dashboard Principal](#-dashboard-principal)
    - [👥 Gestión de Pacientes](#-gestión-de-pacientes)
    - [📅 Sistema de Citas](#-sistema-de-citas)
    - [📋 Reportes Médicos](#-reportes-médicos)
    - [🎤 Transcripción con IA](#-transcripción-con-ia)
    - [🌙 Modo Oscuro/Claro](#-modo-oscuroclaro)
  - [🗂️ Estructura del Proyecto](#️-estructura-del-proyecto)
  - [🔧 Scripts Disponibles](#-scripts-disponibles)
  - [📱 Responsive Design](#-responsive-design)
  - [🔒 Seguridad](#-seguridad)
  - [🚀 Despliegue](#-despliegue)
  - [📝 Licencia](#-licencia)

## ✨ Características Principales

- 🔐 **Autenticación completa** - Sistema de login/registro para médicos
- 👥 **Gestión de pacientes** - CRUD completo de expedientes médicos
- 📅 **Sistema de citas** - Programación y seguimiento de consultas
- 📋 **Reportes médicos** - Generación y gestión de reportes clínicos
- 🎤 **Transcripción con IA** - Convierte audio de consultas a texto usando Google Gemini
- 📊 **Dashboard intuitivo** - Estadísticas y resumen de actividades
- 🌙 **Tema claro/oscuro** - Interfaz adaptable al gusto del usuario
- 📱 **Diseño responsive** - Optimizado para dispositivos móviles y desktop
- 🔍 **Búsqueda avanzada** - Filtros y búsqueda en tiempo real
- ⚡ **Performance optimizada** - Carga rápida con Next.js 15

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 15** - Framework React con App Router
- **React 19** - Biblioteca de UI con las últimas características
- **TypeScript** - Tipado estático para mejor desarrollo
- **Tailwind CSS** - Framework de CSS utilitario
- **Radix UI** - Componentes accesibles y sin estilo
- **Lucide React** - Iconos modernos y escalables

### Backend & Base de Datos
- **Supabase** - Backend as a Service con PostgreSQL
- **PostgreSQL** - Base de datos relacional robusta
- **Row Level Security** - Seguridad a nivel de fila (configuración opcional)

### IA & Servicios
- **Google Gemini AI** - Transcripción de audio a texto
- **Supabase Auth** - Autenticación y autorización

### Desarrollo
- **ESLint** - Linter para mantener código limpio
- **PostCSS** - Procesamiento de CSS
- **pnpm** - Gestor de paquetes rápido y eficiente

## 🚀 Instalación y Configuración

### Requisitos Previos

- Node.js 18+ 
- pnpm (recomendado) o npm
- Cuenta en [Supabase](https://supabase.com)
- API Key de [Google AI Studio](https://makersuite.google.com/app/apikey)

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd tec-salud-v0
```

### 2. Instalar Dependencias

```bash
# Con pnpm (recomendado)
pnpm install

# O con npm
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url_aquí
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aquí

# Google Gemini AI
GEMINI_API_KEY=tu_gemini_api_key_aquí
```

### 4. Configurar Base de Datos Supabase

1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Copia y pega todo el contenido del archivo `supabase-schema-sin-rls.sql`
4. Ejecuta el script para crear todas las tablas y funciones

### 5. Ejecutar la Aplicación

```bash
# Modo desarrollo
pnpm dev

# O con npm
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## 🔑 Variables de Entorno (.env.local)

```env
# =============================================
# CONFIGURACIÓN SUPABASE (OBLIGATORIO)
# =============================================
# Obtén estos valores de tu panel de Supabase > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =============================================
# GOOGLE GEMINI AI (OBLIGATORIO para transcripción)
# =============================================
# Obtén tu API key de: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=AIzaSyC...
```

### 📍 Cómo obtener las variables:

#### Supabase:
1. Ve a [supabase.com](https://supabase.com) y crea/abre tu proyecto
2. Ve a **Settings** → **API**
3. Copia el **Project URL** para `NEXT_PUBLIC_SUPABASE_URL`
4. Copia la **anon public** key para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Google Gemini:
1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Cópiala para `GEMINI_API_KEY`

## 📊 Base de Datos

El sistema utiliza una base de datos PostgreSQL con las siguientes tablas principales:

- **`doctors`** - Información de médicos registrados
- **`patients`** - Expedientes de pacientes
- **`appointments`** - Citas médicas programadas
- **`medical_reports`** - Reportes y diagnósticos

El esquema incluye:
- ✅ Triggers automáticos para `updated_at`
- ✅ Índices para optimización de consultas
- ✅ Función automática para crear perfil de doctor al registrarse
- ✅ Validaciones de datos y tipos específicos

## 🎯 Funcionalidades Detalladas

### 🔐 Sistema de Autenticación

- **Registro de médicos** con validación de datos
- **Login seguro** con email y contraseña
- **Logout** con limpieza de sesión
- **Gestión de estado** de autenticación global
- **Redirección automática** según estado de login

#### Campos de registro:
- Nombre y apellido
- Email (único)
- Contraseña (mínimo 6 caracteres)
- Especialidad médica
- Teléfono (opcional)
- Número de licencia (opcional)

### 📊 Dashboard Principal

- **Estadísticas en tiempo real**:
  - Total de pacientes registrados
  - Citas programadas para hoy
  - Citas completadas este mes
  - Reportes médicos generados

- **Calendario integrado** con vista mensual
- **Lista de citas pendientes** con acciones rápidas
- **Navegación rápida** a todas las secciones

### 👥 Gestión de Pacientes

#### Listado de pacientes:
- **Vista en tabla** con información resumida
- **Búsqueda en tiempo real** por nombre
- **Filtros** por género, edad, etc.
- **Acciones rápidas**: ver, editar, eliminar

#### Expediente completo:
- Datos personales básicos
- Información de contacto
- Contacto de emergencia
- Historial médico completo
- Alergias conocidas
- Medicamentos actuales

### 📅 Sistema de Citas

- **Programación de citas** con selector de fecha/hora
- **Estados de cita**: Programada, Completada, Cancelada, No asistió
- **Asociación automática** con paciente y doctor
- **Notas de consulta** para cada cita
- **Diagnósticos y tratamientos** registrados

### 📋 Reportes Médicos

- **Creación de reportes** vinculados a pacientes
- **Tipos de reporte** configurables
- **Editor de contenido** rico para diagnósticos
- **Búsqueda y filtrado** de reportes históricos
- **Asociación opcional** con citas específicas

### 🎤 Transcripción con IA

**Endpoint**: `/api/transcribe`

- **Subida de archivos de audio** desde el cliente
- **Transcripción automática** usando Google Gemini AI
- **Optimizado para consultas médicas** en español
- **Formatos soportados**: WAV, MP3, M4A, etc.
- **Respuesta estructurada** con texto transcrito

#### Uso de la API:
```typescript
const formData = new FormData()
formData.append('audio', audioFile)
formData.append('language', 'es-MX')

const response = await fetch('/api/transcribe', {
  method: 'POST',
  body: formData
})

const result = await response.json()
// result.transcript contiene el texto transcrito
```

### 🌙 Modo Oscuro/Claro

- **Alternancia automática** entre temas
- **Persistencia** de preferencia del usuario
- **Sincronización** con preferencias del sistema
- **Transiciones suaves** entre modos

## 🗂️ Estructura del Proyecto
