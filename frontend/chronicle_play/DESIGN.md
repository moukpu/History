# Design System Document: The Illustrated Explorer

## 1. Overview & Creative North Star
**Creative North Star: "The Living Storybook"**

This design system rejects the sterile, grid-locked "tech" aesthetic in favor of a lush, tactile, and immersive experience. We are not building a dashboard; we are crafting a digital pop-up book. The goal is to make every interaction feel like a discovery. 

To break the "template" look, we utilize **Intentional Asymmetry** and **Dynamic Overlap**. Elements should not always sit side-by-side in rigid columns; they should float, overlap, and peek out from behind one another. We use the extreme `xl` and `full` roundedness scales to create "pill-like" containers that feel safe, friendly, and organic.

## 2. Color Theory & Surface Strategy
Our palette is vibrant and adventurous, moving away from the "safe" grays of corporate UI.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or tonal transitions. Use `surface-container-low` sections sitting on a `surface` background to define areas.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use "Tonal Stepping" to create depth:
*   **Base:** `surface` (#f7f6f2) – The canvas.
*   **Secondary Sections:** `surface-container-low` (#f1f1ed) – To group content.
*   **Hero Elements:** `surface-container-lowest` (#ffffff) – To make cards "pop" against the off-white base.

### The Glass & Gradient Rule
To move beyond a flat look, apply a **Signature Glow**:
*   **CTAs:** Use a subtle linear gradient from `primary` (#006668) to `primary_container` (#52f2f5) at a 135-degree angle. This adds a "gemstone" polish.
*   **Floating Navigation:** Use `surface_container_lowest` at 80% opacity with a `backdrop-filter: blur(12px)`. This creates a frosted-glass effect that keeps the historical illustrations visible underneath.

## 3. Typography: The Editorial Voice
We use a high-contrast typographic scale to guide young readers through their adventure.

*   **The Hero (Display & Headline):** *Plus Jakarta Sans*. This provides a modern yet friendly structure. 
    *   *Usage:* Use `display-lg` for chapter titles and big wins. Always use a slight negative letter-spacing (-0.02em) to keep it feeling tight and intentional.
*   **The Narrator (Title & Body):** *Be Vietnam Pro*. This provides excellent legibility for historical facts and quest instructions.
    *   *Usage:* `title-lg` for card headings; `body-md` for standard instructional text.

**Typographic Depth:** Avoid using `#000000`. Use `on_background` (#2e2f2d) for all primary text to maintain a soft, premium feel that is easier on children's eyes.

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural lines.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The subtle shift from #ffffff to #f1f1ed creates a natural "lift" without visual clutter.
*   **Ambient Shadows:** For "Quest Cards" or floating buttons, use a "Sunlight Shadow."
    *   *Spec:* `offset-y: 8px`, `blur: 24px`, `color: rgba(46, 47, 45, 0.06)`. This mimics soft, natural ambient light.
*   **The "Ghost Border" Fallback:** If a container is placed on a background of the same color, use the `outline_variant` token at **15% opacity**. Never use a 100% opaque border.

## 5. Components

### Buttons (The "Pill" Variant)
*   **Primary:** `primary` background, `on_primary` text. Shape: `full` (9999px). On hover, transition to `primary_dim`.
*   **Secondary:** `secondary_container` background, `on_secondary_container` text. Use this for "Back" or "Explore More" actions.
*   **Animation:** Scale by 0.95 on click to provide tactile feedback for small hands.

### Adventure Cards
*   **Rule:** Forbid the use of divider lines within cards.
*   **Structure:** Use 32px (`xl` spacing) of vertical white space to separate the header from the body.
*   **Corners:** Always use `xl` (3rem) or `lg` (2rem) radius.

### Input Fields
*   **Style:** Use `surface_container_highest` for the field background with no border. 
*   **Active State:** Transition the background to `primary_container` with a 2px "Ghost Border" of `primary` at 20% opacity.

### Navigation: The "Quest Bar"
A floating bottom navigation bar using the **Glassmorphism Rule**. 
*   **Container:** `surface_container_lowest` @ 85% opacity.
*   **Active State:** Use a `secondary_fixed` (#ffd709) circular indicator behind the active icon.

### New Component: "Discovery Badges"
Small, floating chips used to tag historical eras. 
*   **Style:** `tertiary_container` background with `on_tertiary_container` text.
*   **Placement:** Often "broken" out of the container—placed so it overlaps the top edge of a card by 12px.

## 6. Do's and Don'ts

### Do:
*   **Do** overlap illustrations with text containers to create depth.
*   **Do** use asymmetrical layouts (e.g., a large image on the left, two smaller stacked text blocks on the right).
*   **Do** use "Squircles" and pill shapes exclusively.
*   **Do** use `primary_fixed` for success states and `error_container` for mistakes.

### Don't:
*   **Don't** use 90-degree corners. Everything must be soft.
*   **Don't** use black (#000000) or pure gray. Use the `on_surface` charcoal for warmth.
*   **Don't** use realistic photography. It shatters the "Storybook" illusion. Only use stylized digital illustrations.
*   **Don't** use "Drop Shadows" that are dark and tight. Keep them wide, soft, and barely there.