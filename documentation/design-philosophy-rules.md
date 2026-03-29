# Artie Design Philosophy Rules

These rules define how we design and implement UI so the app feels native, maintainable, and consistent.

## 1) Native-First Product Experience

- Prefer native platform primitives over custom JavaScript recreations when equivalent APIs exist.
- Build with Expo Router native APIs first (for tabs, toolbars, transitions, and native sheet behavior).
- Treat smooth system behavior (scroll reactions, minimize behavior, platform animations) as part of product quality, not polish.

## 2) Expo Router + Native Tabs Standards

- Use native tabs for top-level app navigation.
- Prefer SF Symbols 7 for iOS iconography whenever a suitable symbol exists; only use custom icons/images when SF Symbols cannot express the intent.
- Set the core action tab to `role="search"` when the platform-native separated treatment improves discoverability.
- If `role="search"` overrides the icon in selected state, explicitly set both icon states to keep intended branding.
- Keep tab names aligned with route file names (`camera.tsx`, `marketplace.tsx`, `account.tsx`) for predictable routing.

## 3) iOS 26 API Direction

- Prefer APIs that inherit system materials, transitions, and behaviors by default.
- Use toolbar placement intentionally (`left`, `right`, `bottom`) to match expected native affordances.
- Use bottom accessories only for live or continuously changing content, not static actions.
- Favor native sheet behavior with standard flex layout patterns before introducing custom layout workarounds.

## 4) Screen Construction Rules

- Start each new screen with a clear placeholder implementation before deeper feature work.
- Keep layout primitives simple: one main container, clear alignment strategy, minimal nesting.
- Use human-readable, descriptive, and consistent variable names.
- Keep style object naming consistent across screens (for example: `placeholderScreenContainer`, `centeredPlaceholderText`).

## 5) Comments and Readability

- Add comments only when intent is non-obvious or when platform behavior is easy to miss.
- Prefer concise comments that explain "why" rather than "what".
- Avoid redundant comments for self-explanatory lines.

## 6) Naming and Consistency Rules

- File names for route screens are lowercase and route-driven (`camera.tsx`, `marketplace.tsx`, `account.tsx`).
- Component names are PascalCase and include context (`CameraTabScreen`, `MarketplaceTabScreen`, `AccountTabScreen`).
- Keep naming patterns parallel across sibling files to reduce cognitive load and improve scanning.

## 7) Implementation Checklist for New Native Screens

- Confirm route file naming matches intended URL path.
- Confirm tab trigger name matches route file name.
- Confirm placeholder state is centered and clearly labeled.
- Confirm comments are minimal and intent-focused.
- Confirm style keys and variable names follow existing project conventions.
