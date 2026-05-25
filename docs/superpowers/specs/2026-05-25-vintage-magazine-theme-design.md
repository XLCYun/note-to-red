# Vintage Magazine Theme Design

## Goal

Add a new preset theme for the note preview plugin with a light vintage magazine feel:

- paper-like light yellow off-white background
- warm brown text instead of neutral black
- serif typography for both headings and body content
- restrained magazine cues that support reading rather than dominate it

The theme should feel like a well-preserved old magazine interior page, not an intentionally distressed poster.

## User-Approved Direction

- style direction: light vintage
- primary signal: paper color and warm brown palette
- paper tone: light yellow off-white
- typography: body content should also use serif fonts
- intensity: balanced, not minimal to the point of invisibility, not strong enough to overpower content

## Proposed Theme

### Name

Preset name: `旧刊米黄`

### Visual System

The theme will use a restrained editorial palette:

- page background: `#F7F1E3`
- main text: deep warm brown around `#5F4731`
- heading text: slightly darker brown around `#4E3928`
- accent and emphasis: caramel brown around `#8A5F34`
- secondary metadata: muted brown around `#927559`
- borders and dividers: translucent brown in the `rgba(110, 84, 53, 0.16-0.24)` range

The page remains bright and readable. There will be no heavy texture image, no visible stains, and no aggressive shadows.

### Typography

This theme needs serif typography throughout the content area, not only on headings.

Recommended font stacks:

- body and headings: `Georgia, "Noto Serif SC", "Songti SC", "STSong", SimSun, serif`
- code remains monospace and unchanged in principle

The serif choice should apply to:

- headings
- paragraphs
- lists
- blockquotes
- table cells and headers

This is important because the current renderer appends the global font setting to body text styles, which would otherwise override any serif declaration embedded only in the theme JSON.

## Component-Level Changes

### Preview Container

- keep the current general layout and spacing model
- change the background to the approved light paper tone
- keep padding generous and quiet
- avoid strong gradients; if any gradient is used, it should be extremely subtle

### Header

- preserve the current structure
- use softer brown metadata colors
- keep the avatar treatment clean and simple
- avoid strong ornamental framing

### Titles

- use darker warm brown
- keep serif typography
- use weight and color for hierarchy instead of decorative flourishes
- keep spacing slightly more editorial than default, but not dramatic

### Paragraphs and Lists

- serif body font
- line height around the current comfortable reading range
- warm brown text color
- list bullets and indentation stay familiar to the existing UI

### Quotes

- light left border in caramel brown
- faint tinted background wash is acceptable
- keep the quote readable and calm rather than theatrical

### Code

- remain clearly distinct from prose
- use a pale cream panel that still belongs to the paper palette
- keep monospace font and existing readability conventions

### Tables

- use soft brown borders
- header row gets a subtle tonal distinction
- preserve strong readability and scanning behavior

### Footer and Dividers

- use lighter separators and muted brown text
- keep footer quiet so it does not fight with content

## Architecture and File Changes

Implementation should stay close to existing patterns.

### 1. New preset template

Add a new preset JSON file:

- `src/templates/vintage-magazine.json`

This file will define the new theme styles and metadata.

### 2. Template registration

Update:

- `src/templates/index.ts`

to export the new preset so it is loaded into preset themes on first settings initialization.

### 3. Theme font override support

Update:

- `src/themeManager.ts`

to support optional per-theme font overrides for heading/body text.

Recommended shape:

- add an optional `fonts` object to `Theme.styles` or `Theme`
- support at least:
  - `body`
  - `heading`
  - optionally `table`

Behavior:

- if a theme font override exists, use it instead of `currentFont` for the relevant content type
- if no override exists, preserve the current behavior exactly

This avoids coupling the vintage serif behavior to a hardcoded theme id and keeps the feature reusable for future presets.

### 4. Preview compatibility

No structural changes should be required in:

- `src/settings/ThemePreviewModal.ts`

because it already renders the preview skeleton and delegates style application to `ThemeManager`.

### 5. Custom theme editor compatibility

`src/settings/CreateThemeModal.ts` should not need functional changes if the new font override fields remain optional.

If TypeScript or future editor work requires a default shape for new themes, add empty optional font overrides in the initialization path rather than changing user-visible behavior.

## Data Flow

1. Plugin loads preset templates from `src/templates/index.ts`.
2. Settings bootstrap imports all preset templates and stores them as preset themes.
3. User selects the new vintage preset in the UI.
4. `ThemeManager.setCurrentTheme()` resolves the theme.
5. `ThemeManager.applyTheme()` applies both style strings and any optional theme font overrides.
6. Preview and export surfaces render the new theme consistently.

## Error Handling and Compatibility

- Existing themes must render exactly as before when they do not define font overrides.
- Missing optional font override fields must fall back to the current global font behavior.
- The new preset should remain visible in the theme picker like other preset themes.
- No migration step should be required for existing saved settings.

## Testing Strategy

### Manual verification

Verify in the theme preview modal and the main preview view:

- the new preset appears in the preset list
- selecting it changes the background to light yellow off-white
- headings and body text both render in serif stacks
- metadata remains readable
- code blocks remain monospace
- tables, quotes, separators, and footer match the new palette

### Regression verification

Check at least one existing preset theme to confirm:

- body text still uses the current global font when no theme override is present
- theme switching still works
- no other preset changes visually

## Recommendation

Implement the balanced version of the theme:

- clear paper-tone identity
- serif body typography
- soft editorial hierarchy
- restrained chrome

This best matches the approved direction and the current product's reading-first UI.
