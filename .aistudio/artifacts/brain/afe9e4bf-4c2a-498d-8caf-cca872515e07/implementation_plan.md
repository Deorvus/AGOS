# Implementation Plan: Profile Reorganization & Soft Minimalist Icon Redesign

Redesign section icons across the app into soft, minimalist icons featuring subtle neutral-tinted rounded squircle containers and refined line weights. Reorganize the entire Profile section with clean categorized segmented pill tabs at the top for intuitive information architecture.

## 1. Soft Minimalist Icon Design System
- **Icon Styling Pattern**:
  - Replace stark or raw glyphs/heavy badges with a consistent soft container pattern:
    - Subtle rounded squircle container (`rounded-2xl` or `rounded-xl` with gentle border/tint `bg-slate-100 dark:bg-panel border border-slate-200/60 dark:border-line/60`).
    - Soft neutral/slate base tone with refined SVG stroke weights (`stroke-[1.5]` or `stroke-[1.75]`), giving an airy, crisp, and tactile minimalist look.
    - Soft hover transitions and micro-interactions.
- **Scope of Icon Updates**:
  - **Bottom Navigation Bar** (`src/App.tsx`): Upgrade tab icons (Ride, Navigate, Alerts, Help, Profile) into soft minimalist icon glyphs in subtle rounded containers with refined active states.
  - **Profile Section Headers & Buttons** (`src/components/ProfileView.tsx`): Add soft minimalist squircle icons for each category and action (Identity, Vehicle, Saved Places, Google Sync, Settings shortcut).
  - **Settings & Sheet Sections** (`src/components/SettingsView.tsx`, `src/components/LocationSheet.tsx`): Harmonize section headers and category items with the soft squircle icon design.

## 2. Profile Section Reorganization (`src/components/ProfileView.tsx`)
Reorganize the Profile view from an unsegmented stack into intuitive categorized segmented pills at the top, allowing the user to seamlessly focus on what they need without cognitive clutter:

- **Top Profile Header (Persistent Card)**:
  - Clean card presenting the rider's avatar, edit name trigger, rider code ID, and account status with soft minimalist action buttons.
- **Segmented Category Pills**:
  - **Account & Identity**: Name, profile photo, Google Cloud Sync & backup status, rider ID.
  - **Vehicle & Mobility**: Vehicle type selection (Scooter, Motorcycle, Sedan, SUV, Bike, Walking) with soft squircle badges, avoid water level thresholds, and vehicle clearance guides.
  - **Saved Places**: Home, Work, and favorite frequent destinations with clear shortcut editor cards.
  - **Preferences & Settings**: Direct access to route tolerance, notifications, sound, map display, and app developer/research tools.
- **Visual Polish**:
  - Smooth tab transitions.
  - Consistent spacing, hierarchy, and elimination of cluttered or repetitive cards.

## 3. Verification & Quality Assurance
- Run `npm test` to ensure existing user settings, sync, and storage tests pass.
- Run `compile_applet` to verify TypeScript types and Tailwind CSS compilation.
- Verify clean responsive rendering across mobile and desktop viewport sizes.
