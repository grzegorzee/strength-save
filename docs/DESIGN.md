# Design System Strategy: Kinetic Precision

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"Kinetic Precision."** 

In the world of high-performance strength training, there is no room for clutter. This system moves away from the "template" aesthetic of generic fitness trackers and embraces an editorial, high-end performance vibe. We achieve this through **Intentional Asymmetry** (e.g., staggering card layouts or using off-center display type) and **Tonal Depth**. The goal is to make the user feel like they are operating a piece of precision engineering, where every gram of visual weight is accounted for. We prioritize breathing room and high-contrast "energy pulses" to motivate action without overwhelming the senses.

---

## 2. Colors: The Void and The Pulse
The palette is built on a foundation of "The Void" (`background: #0e0e0e`), allowing our high-energy accents to serve as functional signals rather than just decoration.

*   **Primary Pulse (`#cefc22`):** Use this vibrant lime for primary actions and "success" states. It represents the peak of exertion.
*   **Secondary Flow (`#00e3fd`):** This electric blue is reserved for secondary data points, recovery metrics, or "in-progress" states.
*   **The "No-Line" Rule:** To maintain a premium, seamless feel, **1px solid borders are strictly prohibited** for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface_container_low` (`#131313`) section sitting on a `surface` (`#0e0e0e`) background provides a sophisticated, "soft-touch" boundary that feels modern and expensive.
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of physical layers. Use `surface_container_lowest` for the deepest background elements and `surface_container_highest` (`#262626`) for top-level interactive components.
*   **The Glass & Gradient Rule:** For floating navigation or modal overlays, use **Glassmorphism**. Combine `surface_variant` at 60% opacity with a `backdrop-blur` of 20px. 
*   **Signature Textures:** Apply a subtle linear gradient (Top-Left to Bottom-Right) from `primary` (`#f4ffc9`) to `primary_container` (`#cefc22`) on hero CTAs to give them a "forged" metallic glow.

---

## 3. Typography: Authority in Motion
We use a high-contrast pairing to balance technical precision with aggressive motivation.

*   **Display & Headlines (Space Grotesk):** This typeface is our "voice." It is geometric and slightly eccentric. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for workout titles or heavy PR numbers. The asymmetry of Space Grotesk prevents the app from feeling "stiff."
*   **Body & Labels (Inter):** For everything else, we use Inter. It is the workhorse of the system, providing maximum readability for exercise descriptions and set counts.
*   **Editorial Hierarchy:** Use `headline-lg` (2rem) for section titles, but don't be afraid to leave large amounts of white space around them. The goal is to make the typography feel like it’s "breathing."

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "web 2.0" for this system. We convey depth through light and tone.

*   **The Layering Principle:** Instead of a shadow, place a `surface_container_highest` card inside a `surface_container_low` section. This creates a natural "lift" through value contrast.
*   **Ambient Shadows:** When a card *must* float (e.g., a draggable workout item), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. To add a "signature" touch, add a 4% tint of `primary` to the shadow color to mimic the glow of the accent colors.
*   **The "Ghost Border" Fallback:** If a container lacks sufficient contrast against its neighbor, use a "Ghost Border": `outline-variant` (`#484847`) at 15% opacity. It should be felt, not seen.
*   **Motion Depth:** When a user interacts with a card, transition the background from `surface_container` to a very subtle gradient of `surface_bright`.

---

## 5. Components: Forged Elements

*   **Buttons:** 
    *   *Primary:* Solid `primary_container` (`#cefc22`) with `on_primary_container` text. Use `xl` (1.5rem) rounded corners.
    *   *Secondary:* `surface_container_high` background with a `primary` "Ghost Border" at 20% opacity.
*   **Cards:** 
    *   **Strict Rule:** No dividers. Use vertical spacing (24px or 32px) and subtle shifts between `surface_container_low` and `surface_container_high` to separate content blocks.
    *   Corner Radius: Use `xl` (1.5rem) for main dashboard cards and `md` (0.75rem) for nested items.
*   **Chips:** 
    *   Use `surface_container_highest` for unselected states and the vibrant `secondary` blue for active filters.
*   **Input Fields:**
    *   Inputs should be "sunken" using `surface_container_lowest`. On focus, the bottom edge should glow with a 2px `primary` lime accent line—no full-box stroke.
*   **The "Progress Pulse" (Context Specific):** For strength tracking, use a progress bar with a gradient from `secondary_dim` to `secondary`. Add a `backdrop-blur` to the track itself to make it feel like a liquid tube.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme scale. A massive `display-lg` number next to a tiny `label-md` creates a premium, high-fashion editorial feel.
*   **Do** use "Negative Space as a Feature." If a screen feels crowded, increase the padding-global to 24px and increase the gap between cards.
*   **Do** use `primary` lime sparingly. If everything is vibrant, nothing is vibrant. Use it to guide the eye to the "Start Workout" or "Save" actions.

### Don't:
*   **Don't** use 100% opaque borders or dividers. It "boxes in" the user and ruins the dynamic flow.
*   **Don't** use standard "Grey" shadows. They look muddy on an `#0e0e0e` background. Always use black or a deep-tinted shadow.
*   **Don't** center-align everything. Use left-aligned typography for a more professional, "asymmetric" editorial look.