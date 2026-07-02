# FinancIA

Aplicación de finanzas personales con calidad de app nativa de iPhone: tema oscuro, liquid glass, animaciones spring estilo iOS y persistencia local completa.

## ✨ Funcionalidades

- **Balance animado** con contador spring, indicador +/− (verde/rojo) y pulso de escala al cambiar.
- **Listas infinitas e independientes** (Personal, Casa, Viajes…): cada una con sus categorías, balance, historial y recurrentes.
- **Selector Gastos / Ingresos** con totales del período en el propio control.
- **Selector de período**: todo el tiempo, año o mes — el picker de meses muestra el balance de cada mes.
- **Gráfico de barras interactivo** por categoría (orden desc.), con emoji, color, monto y detalle al tocar.
- **Lista de movimientos virtualizada** agrupada por fecha (`dd/mm/yyyy`), fluida con miles de registros.
- **Alta rápida** vía botón flotante: descripción, monto, tipo, categoría, lista, fecha y repetición (día, semana, quincena, mes, bimestre, trimestre, semestre, año).
- **Categorías con emoji** (teclado nativo) y **color autogenerado a partir del emoji** (canvas), editable después. Creación inline con el botón “+” sin salir del formulario.
- **Transacciones recurrentes** materializadas automáticamente sin duplicados (marca de agua `lastRun` por regla; backfill si la app estuvo cerrada).
- **Búsqueda instantánea** por texto, categoría, lista, tipo (gastos/ingresos/ambos) y rango de fechas.
- **Perfil**: foto (redimensionada localmente), nombre y gestión completa de listas, categorías y recurrentes con confirmaciones destructivas estilo iOS.
- **Persistencia total** en IndexedDB: cerrar y reabrir conserva todo.
- **PWA**: instalable en iPhone desde Safari → Compartir → “Añadir a pantalla de inicio” (pantalla completa, safe areas, status bar translúcida).

## 🚀 Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # type-check + build de producción
npm run preview   # sirve el build
```

## 🏗 Arquitectura

```
src/
├── models/        # Tipos de dominio (List, Category, Transaction, RecurringRule, Period…)
├── services/      # Lógica pura: recurrencia, filtros, color-desde-emoji, haptics
├── store/         # Estado global (zustand + persist sobre IndexedDB) y seed inicial
├── hooks/         # Datos derivados memoizados (balances, totales por categoría…)
├── components/ui/ # Primitivas reutilizables: Sheet, SegmentedControl, AnimatedAmount,
│                  # ConfirmDialog, EmptyState, iconos SF-style
├── features/
│   ├── home/         # Pantalla principal: TopBar, Balance, Tipo, Período, Gráfico,
│   │                 # Lista virtualizada, FAB, detalle, selector de lista
│   ├── transaction/  # Sheet de alta/edición (movimientos y recurrentes) + categorías
│   ├── search/       # Búsqueda con filtros combinables
│   └── profile/      # Perfil y gestión de listas/categorías/recurrentes
├── styles/        # Design tokens iOS dark (tema, glass, radios, safe areas)
└── utils/         # Fechas ISO, dinero, ids
```

### Decisiones clave

- **Rendimiento**: lista de movimientos con `@tanstack/react-virtual` (scroll de ventana), selectores derivados memoizados, componentes `memo`. Fluida con miles de transacciones.
- **Recurrencia sin duplicados**: cada regla guarda `lastRun`; al abrir la app (y al volver a primer plano) se generan solo las ocurrencias en `(lastRun, hoy]`. Las frecuencias mensuales conservan el día ancla con recorte a fin de mes.
- **Color desde emoji**: se rasteriza el emoji en un canvas y se promedian los píxeles ponderados por saturación; el resultado se normaliza a un tono vibrante legible en oscuro. Fallback determinista por hash si el entorno no rasteriza emojis.
- **Acento `#F54927`** reservado para acciones principales, selección y énfasis; el resto de la interfaz usa materiales oscuros translúcidos.
