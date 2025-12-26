# feat: UI/UX Improvements Across All Pages

**Date**: 2025-12-25
**Type**: Enhancement
**Priority**: High
**Scope**: Frontend Design / Pure UI/UX (No Logic Changes)

## Overview

Systematic UI/UX improvements for all pages in the EzyAI medical management system. This plan uses the `frontend-design` plugin to enhance user experience while preserving the existing design system (colors, paleta, branding - Zuli theme).

### Pages to Improve
1. `/dashboard` - Main dashboard with stats
2. `/consultas` - Calendar/appointments
3. `/perfil` - Doctor profile
4. `/especialistas` - Doctor's expedientes/linking management
5. `/user/especialistas` - Patient's specialist marketplace
6. `/user/cuestionario` - Specialty questionnaire

---

## Problem Statement / Motivation

The current UI is functional but can be enhanced with:
- Better visual hierarchy and spacing
- Improved micro-interactions and feedback
- Enhanced loading and empty states
- Better accessibility patterns
- More polished card layouts and transitions
- Improved form UX with better validation feedback
- Consistent component patterns across pages

---

## Technical Approach

### Design System Preservation
- **Colors**: Maintain `zuli-veronica`, `zuli-indigo`, `zuli-cyan`, `zuli-space` palette
- **Gradient**: Keep `btn-zuli-gradient` and `bg-zuli-tricolor`
- **Typography**: Preserve existing font hierarchy
- **Components**: Enhance existing shadcn/ui components

### Improvement Categories
1. **Visual Hierarchy**: Better spacing, card shadows, borders
2. **Micro-interactions**: Hover states, transitions, animations
3. **Loading States**: Skeleton screens, shimmer effects
4. **Empty States**: Engaging illustrations and CTAs
5. **Form UX**: Better input focus states, validation feedback
6. **Accessibility**: Focus indicators, ARIA labels, keyboard navigation

---

## Page-by-Page Improvements

### 1. Dashboard Page (`/dashboard`)

**File**: `app/(dashboard)/dashboard/page.tsx`

**Current State Analysis**:
- Simple layout with stats, calendar widget, and pending appointments
- Uses `DashboardStats`, `CalendarWidget`, `PendingAppointments` components

**Improvements**:

#### 1.1 DashboardStats (`components/dashboard/dashboard-stats.tsx:131-149`)
```tsx
// BEFORE: Basic card layout
<Card key={index} className="hover:shadow-lg transition-shadow duration-200">

// AFTER: Enhanced with subtle animations and better visual feedback
<Card key={index} className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-transparent hover:border-zuli-veronica/20">
  <CardContent className="p-6 relative overflow-hidden">
    {/* Gradient accent on hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-zuli-veronica/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    {/* Content with improved spacing */}
    <div className="relative flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">{stat.title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{stat.value}</p>
      </div>
      <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
        <stat.icon className="h-7 w-7" />
      </div>
    </div>
  </CardContent>
</Card>
```

#### 1.2 PendingAppointments (`components/dashboard/pending-appointments.tsx:188-227`)
- Add staggered animation for appointment cards
- Improve empty state with illustration
- Better hover feedback on cards
- Add subtle pulse animation for "Iniciar Consulta" button

```tsx
// Staggered animation classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {appointments.map((appointment, index) => (
    <Card
      key={appointment.id}
      className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 hover:border-zuli-veronica/30"
      style={{ animationDelay: `${index * 50}ms` }}
    >
```

#### 1.3 Header Improvements
```tsx
// Add welcome message and time-based greeting
const greeting = getTimeBasedGreeting() // "Buenos días", "Buenas tardes", etc.

<div>
  <p className="text-sm text-gray-500 dark:text-gray-400">{greeting}</p>
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
  <p className="text-gray-600 dark:text-gray-400 capitalize">{currentDate}</p>
</div>
```

---

### 2. Consultas/Calendar Page (`/consultas`)

**File**: `components/appointments/appointment-calendar.tsx`

**Current State Analysis**:
- Complex calendar with week/list views
- Toggle between views
- Filter buttons (Hoy, Esta semana, Este mes)

**Improvements**:

#### 2.1 View Toggle Enhancement (`lines 346-366`)
```tsx
// BEFORE: Basic toggle
<div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">

// AFTER: Polished segmented control with animation
<div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner">
  <Button
    variant={viewMode === "list" ? "default" : "ghost"}
    size="sm"
    onClick={() => setViewMode("list")}
    className={cn(
      "rounded-lg transition-all duration-200",
      viewMode === "list"
        ? "bg-white dark:bg-gray-700 shadow-sm text-zuli-veronica"
        : "text-gray-600 hover:text-gray-900"
    )}
  >
```

#### 2.2 Filter Pills Enhancement (`lines 371-388`)
```tsx
// Add pill-style with smooth transitions
<div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-full">
  {["Hoy", "Esta semana", "Este mes"].map((filter) => (
    <Button
      key={filter}
      variant="ghost"
      size="sm"
      onClick={() => setSelectedFilter(filter)}
      className={cn(
        "rounded-full px-4 transition-all duration-200",
        selectedFilter === filter
          ? "bg-zuli-veronica text-white shadow-md shadow-zuli-veronica/25"
          : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
      )}
    >
      {filter}
    </Button>
  ))}
</div>
```

#### 2.3 Appointment Cards in Today View (`lines 524-576`)
- Add subtle gradient background
- Improve avatar ring on hover
- Add status dot indicator instead of full badge for compact view
- Smoother hover transitions

```tsx
<div
  key={appointment.id}
  className={cn(
    "bg-white dark:bg-gray-800 rounded-xl p-5",
    "border-2 border-gray-100 dark:border-gray-700",
    "hover:border-teal-200 dark:hover:border-teal-600",
    "hover:shadow-lg hover:shadow-teal-500/10",
    "transition-all duration-300 cursor-pointer",
    "group"
  )}
  onClick={() => handleStartConsultation(appointment)}
>
```

#### 2.4 Empty State Enhancement
```tsx
// Add illustration and more engaging CTA
<div className="text-center py-16">
  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center">
    <CalendarIcon className="h-12 w-12 text-teal-400" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
    Sin consultas programadas
  </h3>
  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
    No tienes consultas para este período. ¡Es un buen momento para organizar tu agenda!
  </p>
  <Button className="btn-zuli-gradient">
    <Plus className="mr-2 h-4 w-4" />
    Programar consulta
  </Button>
</div>
```

---

### 3. Profile Page (`/perfil`)

**File**: `app/(dashboard)/perfil/page.tsx`

**Current State Analysis**:
- Form-heavy page with multiple textareas
- Simple card layout
- Basic loading state

**Improvements**:

#### 3.1 Profile Header Enhancement
```tsx
// Add avatar preview with upload button overlay
<div className="relative group">
  {form.avatar_url ? (
    <img
      src={form.avatar_url}
      alt="Avatar"
      className="w-24 h-24 rounded-full object-cover ring-4 ring-zuli-veronica/20"
    />
  ) : (
    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-zuli-veronica to-zuli-indigo flex items-center justify-center text-white text-3xl font-bold">
      {form.full_name?.[0] || "D"}
    </div>
  )}
  <button className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
    <Camera className="h-6 w-6 text-white" />
  </button>
</div>
```

#### 3.2 Form Section Cards (`lines 136-234`)
```tsx
// Split form into logical sections with better visual separation
<div className="grid gap-6">
  {/* Basic Info Section */}
  <Card className="overflow-hidden">
    <div className="h-1 bg-gradient-to-r from-zuli-veronica to-zuli-indigo" />
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <User className="h-5 w-5 text-zuli-veronica" />
        Información básica
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Form fields */}
    </CardContent>
  </Card>

  {/* Credentials Section */}
  <Card className="overflow-hidden">
    <div className="h-1 bg-gradient-to-r from-zuli-cyan to-zuli-indigo" />
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-zuli-cyan" />
        Formación y credenciales
      </CardTitle>
    </CardHeader>
    {/* ... */}
  </Card>
</div>
```

#### 3.3 Input Focus States
```tsx
// Enhanced focus ring with brand color
<Input
  className="focus:ring-2 focus:ring-zuli-veronica/30 focus:border-zuli-veronica transition-all duration-200"
/>
```

#### 3.4 Success Feedback
```tsx
// Animated success message with icon
{status && (
  <Alert className="bg-green-50 border-green-200 text-green-700 animate-in fade-in slide-in-from-top-2 duration-300">
    <CheckCircle2 className="h-4 w-4" />
    <AlertDescription>{status}</AlertDescription>
  </Alert>
)}
```

---

### 4. Especialistas Page (Doctor View) (`/especialistas`)

**File**: `app/(dashboard)/especialistas/page.tsx`

**Current State Analysis**:
- Shows link requests and lab orders
- Simple list layout
- Basic styling

**Improvements**:

#### 4.1 Page Header
```tsx
// Add context and quick actions
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Expedientes</h1>
    <p className="text-sm text-gray-500 mt-1">
      Gestiona tus vínculos con pacientes y solicitudes
    </p>
  </div>
  <Button variant="outline" size="sm" asChild>
    <Link href="/perfil">
      <Settings className="h-4 w-4 mr-2" />
      Editar perfil
    </Link>
  </Button>
</div>
```

#### 4.2 LinkRequests Enhancement (`components/doctor/link-requests.tsx:113-133`)
```tsx
// Better card layout with avatar and actions
<div className="grid gap-3">
  {pending.map((link) => (
    <div
      key={link.id}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl",
        "bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/10",
        "border border-amber-200 dark:border-amber-800",
        "hover:shadow-md transition-shadow duration-200"
      )}
    >
      <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
        <User className="h-6 w-6 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">
          {patient?.full_name ?? "Paciente"}
        </p>
        <p className="text-sm text-gray-500">{patient?.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="bg-green-500 hover:bg-green-600"
          onClick={() => updateStatus(link.id, "accepted")}
        >
          <Check className="h-4 w-4 mr-1" />
          Aceptar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-gray-500 hover:text-red-500"
          onClick={() => updateStatus(link.id, "rejected")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ))}
</div>
```

#### 4.3 Empty State for No Requests
```tsx
<div className="text-center py-12 px-4">
  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
    <Users className="h-8 w-8 text-gray-400" />
  </div>
  <h3 className="text-base font-medium text-gray-900 mb-1">
    Sin solicitudes pendientes
  </h3>
  <p className="text-sm text-gray-500 max-w-xs mx-auto">
    Las nuevas solicitudes de vinculación de pacientes aparecerán aquí
  </p>
</div>
```

---

### 5. User Especialistas (Marketplace) (`/user/especialistas`)

**File**: `app/user/especialistas/page.tsx`

**Current State Analysis**:
- Grid of doctor cards with filters
- Search functionality
- Specialty badges

**Improvements**:

#### 5.1 Search Bar Enhancement (`lines 191-205`)
```tsx
// Add glass-morphism effect and better icon placement
<div className="relative flex-1 group">
  <div className="absolute inset-0 bg-gradient-to-r from-zuli-veronica/5 to-zuli-indigo/5 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-zuli-veronica transition-colors" />
  <Input
    placeholder="Buscar por nombre o especialidad..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-12 py-3 rounded-xl border-gray-200 focus:border-zuli-veronica focus:ring-zuli-veronica/20 transition-all"
  />
</div>
```

#### 5.2 Specialty Filter Pills (`lines 208-241`)
```tsx
// Scrollable horizontal filter with better styling
<div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
  <Button
    variant={selectedSpecialty === null ? "default" : "outline"}
    size="sm"
    onClick={() => setSelectedSpecialty(null)}
    className={cn(
      "rounded-full whitespace-nowrap",
      selectedSpecialty === null && "bg-zuli-veronica hover:bg-zuli-veronica-600 shadow-md"
    )}
  >
    Todas las especialidades
  </Button>
  {specialties.map((spec) => (
    <Button
      key={spec.id}
      variant="outline"
      size="sm"
      onClick={() => setSelectedSpecialty(spec.id)}
      className={cn(
        "rounded-full whitespace-nowrap border-2 transition-all",
        selectedSpecialty === spec.id
          ? "border-zuli-veronica bg-zuli-veronica/10 text-zuli-veronica"
          : "hover:border-gray-300"
      )}
    >
      {specialtyIcons[spec.name]}
      <span className="ml-1.5">{spec.name}</span>
    </Button>
  ))}
</div>
```

#### 5.3 Doctor Card Enhancement (`lines 268-343`)
```tsx
// More polished card with better hover states
<Card
  className={cn(
    "group cursor-pointer overflow-hidden",
    "border-2 border-transparent",
    "hover:border-zuli-veronica/20 hover:shadow-xl",
    "transition-all duration-300"
  )}
  onClick={() => handleSelectDoctor(doctor)}
>
  <CardContent className="p-0">
    {/* Top accent bar */}
    <div className="h-1 bg-gradient-to-r from-zuli-veronica to-zuli-indigo opacity-0 group-hover:opacity-100 transition-opacity" />

    <div className="p-5">
      {/* Avatar with ring */}
      <div className="flex items-start gap-4">
        {doctor.avatar_url ? (
          <img
            src={doctor.avatar_url}
            alt={doctor.first_name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-zuli-veronica/30 transition-all"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-zuli-veronica to-zuli-indigo text-white flex items-center justify-center text-xl font-bold shrink-0 group-hover:scale-105 transition-transform">
            {doctor.first_name?.[0]}
          </div>
        )}
        {/* ... rest of content */}
      </div>

      {/* CTA with arrow animation */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Stars */}
        </div>
        <span className="text-sm font-medium text-zuli-veronica flex items-center gap-1">
          Solicitar cita
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### 6. Cuestionario Page (`/user/cuestionario`)

**File**: `app/user/cuestionario/page.tsx`

**Current State Analysis**:
- Multi-step questionnaire with progress bar
- Boolean, single_select, and multi_select question types
- Laboratory selection step

**Improvements**:

#### 6.1 Progress Header Enhancement (`lines 802-827`)
```tsx
// Add step indicator and smoother progress animation
<Card className="bg-gradient-to-r from-zuli-veronica to-zuli-indigo text-white border-0 overflow-hidden">
  <CardContent className="py-8 relative">
    {/* Decorative pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/20 translate-y-1/2 -translate-x-1/2" />
    </div>

    <div className="relative flex items-center gap-6">
      {/* Larger avatar */}
      <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold ring-4 ring-white/30">
        {doctor.first_name?.[0]}
      </div>

      <div className="flex-1">
        <p className="text-white/80 text-sm">Cuestionario para</p>
        <p className="font-bold text-xl">
          Dr. {doctor.first_name} {doctor.last_name}
        </p>
        <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-0">
          {specialtyIcons[specialty.name]}
          <span className="ml-1">{specialty.name}</span>
        </Badge>
      </div>

      {/* Progress circle */}
      <div className="relative h-16 w-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20" />
          <circle
            cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2"
            strokeDasharray={`${progress} 100`}
            className="text-white transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  </CardContent>
</Card>
```

#### 6.2 Question Cards Enhancement (`lines 842-859`)
```tsx
// Add animation and better visual hierarchy
<Card
  className={cn(
    "border-2 transition-all duration-300",
    answers[q.id] !== undefined
      ? "border-green-200 bg-green-50/30"
      : "border-gray-100 hover:border-zuli-veronica/20"
  )}
  style={{
    animationDelay: `${index * 50}ms`,
    animation: "fadeInUp 0.4s ease-out forwards"
  }}
>
  <CardContent className="pt-6 space-y-4">
    <div className="flex items-start gap-4">
      {/* Numbered indicator with completion state */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
        answers[q.id] !== undefined
          ? "bg-green-500 text-white"
          : "bg-zuli-veronica/10 text-zuli-veronica"
      )}>
        {answers[q.id] !== undefined ? <Check className="h-5 w-5" /> : index + 1}
      </div>
      {/* ... */}
    </div>
  </CardContent>
</Card>
```

#### 6.3 Boolean Buttons Enhancement (`lines 527-546`)
```tsx
// Larger, more touch-friendly buttons with icons
<div className="grid grid-cols-2 gap-3">
  <Button
    type="button"
    variant={value === true ? "default" : "outline"}
    className={cn(
      "h-14 text-base font-medium transition-all",
      value === true
        ? "bg-zuli-indigo hover:bg-zuli-indigo-600 shadow-lg shadow-zuli-indigo/25"
        : "hover:border-zuli-indigo/50"
    )}
    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: true }))}
  >
    <CheckCircle2 className="h-5 w-5 mr-2" />
    Sí
  </Button>
  <Button
    type="button"
    variant={value === false ? "default" : "outline"}
    className={cn(
      "h-14 text-base font-medium transition-all",
      value === false
        ? "bg-slate-600 hover:bg-slate-700 shadow-lg"
        : "hover:border-slate-300"
    )}
    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: false }))}
  >
    <XCircle className="h-5 w-5 mr-2" />
    No
  </Button>
</div>
```

#### 6.4 Multi-select Badges Enhancement (`lines 567-590`)
```tsx
// Chip-style with better selection feedback
<div className="flex flex-wrap gap-2">
  {options.map((opt: string) => {
    const isSelected = selectedValues.includes(opt)
    return (
      <button
        key={opt}
        type="button"
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200",
          isSelected
            ? "bg-zuli-veronica text-white border-zuli-veronica shadow-md shadow-zuli-veronica/25"
            : "bg-white text-gray-700 border-gray-200 hover:border-zuli-veronica/50 hover:bg-zuli-veronica/5"
        )}
        onClick={() => { /* toggle */ }}
      >
        {isSelected && <Check className="h-4 w-4 mr-1.5 inline" />}
        {opt}
      </button>
    )
  })}
</div>
```

#### 6.5 Laboratory Selection Cards (`lines 712-735`)
```tsx
// Better grid layout with selection animation
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {LAB_PROVIDERS.map((provider) => (
    <button
      key={provider.id}
      onClick={() => {
        setSelectedProvider(provider.id)
        setSelectedBranch(null)
      }}
      className={cn(
        "relative p-6 rounded-2xl border-2 transition-all duration-200",
        "flex flex-col items-center gap-3 text-center",
        selectedProvider === provider.id
          ? "border-zuli-veronica bg-zuli-veronica/5 shadow-lg shadow-zuli-veronica/10"
          : "border-gray-200 hover:border-zuli-veronica/30 hover:bg-gray-50"
      )}
    >
      {selectedProvider === provider.id && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-5 w-5 text-zuli-veronica" />
        </div>
      )}
      <span className="text-4xl">{provider.logo}</span>
      <div>
        <p className="font-semibold text-gray-900">{provider.name}</p>
        <p className="text-xs text-gray-500">{provider.branches.length} sucursales</p>
      </div>
    </button>
  ))}
</div>
```

---

## Global Improvements

### CSS Animations (`app/globals.css`)

Add these keyframes and utility classes:

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-fadeInUp {
  animation: fadeInUp 0.4s ease-out forwards;
}

.animate-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* Improved focus states */
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-zuli-veronica/30 focus:ring-offset-2;
}

/* Scrollbar hide utility */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### Skeleton Loading Enhancement

```tsx
// components/ui/skeleton-card.tsx
export function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-200 animate-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-shimmer" />
            <div className="h-3 w-1/2 bg-gray-200 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] All pages render correctly with new styles
- [ ] No changes to business logic or data flow
- [ ] Existing color palette (zuli-*) is preserved
- [ ] All interactive elements remain functional

### Non-Functional Requirements
- [ ] Animations are smooth (60fps)
- [ ] Transitions don't cause layout shift
- [ ] Loading states appear within 100ms
- [ ] Focus states are visible for keyboard navigation

### Accessibility
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Interactive elements have proper ARIA labels
- [ ] Animations respect `prefers-reduced-motion`

### Quality Gates
- [ ] Visual review of each page
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1280px)
- [ ] Verify dark mode compatibility

---

## Implementation Strategy

### Phase 1: Global Foundations
1. Add CSS animations to `globals.css`
2. Update loading/skeleton states
3. Add focus ring utilities

### Phase 2: Component Enhancements
1. Update stat cards in Dashboard
2. Enhance pending appointments cards
3. Improve calendar view components

### Phase 3: Form UX
1. Profile page form sections
2. Cuestionario question cards
3. Input focus states

### Phase 4: Marketplace & Lists
1. Specialist cards enhancement
2. Link requests layout
3. Filter/search improvements

### Phase 5: Polish & Testing
1. Animation timing adjustments
2. Responsive testing
3. Accessibility audit

---

## References & Research

### Internal References
- `components/ui/button.tsx` - Base button component
- `components/ui/card.tsx` - Base card component
- `tailwind.config.ts` - Zuli color palette
- `app/globals.css` - Global styles

### External References
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Tailwind CSS Animation](https://tailwindcss.com/docs/animation)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Related Work
- Current branch: `feat/ui-improvements-linking-flow`
- Commits: `3d42451`, `ae4c641`

---

## SpecFlow Analysis: Additional UX Gaps Identified

The following gaps were identified during spec flow analysis and should be addressed:

### Critical (Must Fix)

#### 1. Network Error Handling
- **Gap**: No specification for network timeout, offline mode, or API failure states
- **Solution**: Add toast notifications with retry buttons for failed operations
- **Files**: All API-connected components

#### 2. Form Data Loss Prevention
- **Gap**: No auto-save or "unsaved changes" warning
- **Solution**: Add `beforeunload` listeners and localStorage draft saving for forms
- **Files**: `perfil/page.tsx`, `cuestionario/page.tsx`

#### 3. Loading State Specifications
- **Gap**: No detail on skeleton screen content structure
- **Solution**: Use `SkeletonCard` component with shimmer effect matching content dimensions
- **Files**: All pages with async data

### Important (Should Fix)

#### 4. Keyboard Navigation
- **Gap**: No keyboard shortcuts or custom tab order for calendar
- **Solution**: Add arrow key navigation for calendar dates, Enter to select
- **Files**: `appointment-calendar.tsx`

#### 5. Empty State Differentiation
- **Gap**: Same message for "no data yet" vs. "no results for filter"
- **Solution**: Create distinct empty states with different CTAs
- **Files**: All list/grid components

#### 6. Mobile Touch Targets
- **Gap**: No minimum touch target size specifications
- **Solution**: Ensure all interactive elements are ≥44px
- **Files**: Filter pills, calendar cells, multi-select chips

#### 7. Reduced Motion Support
- **Gap**: No `prefers-reduced-motion` implementation
- **Solution**: Add CSS media query to disable decorative animations
- **Files**: `globals.css`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Nice to Have

#### 8. Optimistic Updates
- Accept/reject buttons should update UI immediately with rollback on error

#### 9. Real-time Sync
- Consider Supabase Realtime for appointment and link request updates

#### 10. Image Optimization
- Use Next.js `<Image>` component with blur-up placeholders for avatars

---

## Updated Acceptance Criteria

### Functional Requirements
- [ ] All pages render correctly with new styles
- [ ] No changes to business logic or data flow
- [ ] Existing color palette (zuli-*) is preserved
- [ ] All interactive elements remain functional
- [ ] Error states display appropriate feedback messages
- [ ] Forms warn users about unsaved changes

### Non-Functional Requirements
- [ ] Animations are smooth (60fps)
- [ ] Transitions don't cause layout shift
- [ ] Loading states appear within 100ms
- [ ] Focus states are visible for keyboard navigation
- [ ] Touch targets are minimum 44px on mobile

### Accessibility (WCAG 2.1 AA)
- [ ] Focus indicators are visible on all backgrounds
- [ ] Color contrast meets 4.5:1 for text, 3:1 for UI
- [ ] Interactive elements have proper ARIA labels
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Keyboard navigation works for all interactive elements

### Mobile UX
- [ ] Test on 375px (iPhone SE)
- [ ] Test on 768px (iPad)
- [ ] All touch targets ≥44px
- [ ] Calendar collapses to list view on mobile
- [ ] Forms have appropriate keyboard types
