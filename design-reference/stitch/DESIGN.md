---
name: Revenue Velocity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001a42'
  on-tertiary-container: '#3980f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  code:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

The design system is engineered for high-performance B2B SaaS environments, specifically targeting revenue teams operating at scale. The brand personality is **data-driven, efficient, and results-oriented**. It balances the technical precision required for AI-driven insights with the approachable communication nature of WhatsApp.

The visual style is **Corporate / Modern** with a lean toward high-density utility. It prioritizes clarity and speed of information processing through:
- **Professionalism:** A stable, trustworthy foundation built on deep navy tones.
- **Momentum:** Using vibrant emerald accents to signal growth, conversion, and positive revenue movement.
- **Precision:** Sharp typography and systematic spacing that reflect the accuracy of the underlying AI engine.

## Colors

The palette is designed to instill confidence while highlighting key performance indicators.

- **Primary (Midnight Blue):** Used for navigation, primary headings, and structural elements. It provides a grounded, authoritative presence.
- **Secondary (Emerald Green):** Reserved for "Success" states, revenue growth indicators, and primary Call-to-Actions. It represents the "Grow" in the product's mission.
- **Tertiary (Action Blue):** A supportive blue used for links, secondary interactive elements, and AI-specific feature highlights to distinguish them from standard revenue metrics.
- **Neutral (Slate):** A sophisticated range of grays used for secondary text, borders, and UI backgrounds to maintain a clean, professional hierarchy.
- **Surface:** A combination of pure white (#FFFFFF) for cards and a very light gray-blue (#F8FAFC) for page backgrounds to reduce eye strain during long working sessions.

## Typography

The typography strategy uses a dual-font approach to maximize both brand character and data legibility.

- **Headlines:** Plus Jakarta Sans provides a modern, slightly geometric feel that looks professional in bold weights. Use it for page titles, section headers, and high-level metrics.
- **Body & Data:** Inter is used for all UI components, tables, and long-form text. Its high x-height and neutral character make it ideal for the dense data environments typical of a revenue engine.
- **Hierarchy:** Maintain strict contrast between labels and values. Use `label-md` in slate-500 for captions and `body-md` or `headline-md` in midnight blue for actual data points.

## Layout & Spacing

The design system utilizes a **12-column fluid grid** for the main content area, with a fixed sidebar for primary navigation. 

- **Grid:** On desktop, use a 24px gutter and 32px side margins. Elements should snap to column spans (e.g., dashboard widgets spanning 3, 4, or 6 columns).
- **Rhythm:** An 8px base unit drives all spacing. Component internal padding should follow the `sm` (8px) or `md` (16px) tokens, while section-to-section spacing should utilize `xxl` (48px).
- **Mobile Adaptivity:** At the 768px breakpoint, the grid collapses to 1 column with 16px horizontal margins. Navigation moves to a bottom bar or a simplified hamburger menu to prioritize the "WhatsApp-first" sales workflow.

## Elevation & Depth

To maintain a "High-Performance" feel, the system avoids heavy drop shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Background):** Used for the main app background. No shadow. Color: Slate-50.
- **Level 1 (Cards/Widgets):** The primary work surface. Uses a 1px border in Slate-200 and a very soft, diffused shadow (0px 1px 3px rgba(15, 23, 42, 0.08)).
- **Level 2 (Hover/Active):** Used when a card is interactive. Increase shadow spread and add a subtle primary-colored glow to the border.
- **Level 3 (Modals/Popovers):** Highest elevation. Uses a larger shadow (0px 10px 15px -3px rgba(15, 23, 42, 0.12)) to clearly separate the utility from the background data.

## Shapes

The shape language is professional and modern, using "Rounded" corners to soften the density of the data-heavy interface.

- **Base Radius (8px):** Applied to standard buttons, input fields, and small UI components.
- **Large Radius (16px):** Applied to dashboard cards, modal containers, and feature highlights.
- **Extra Large (24px):** Used exclusively for specialized "Growth" containers or high-level AI insight panels.
- **Interactive Elements:** Checkboxes use a 4px radius, while tags and status indicators (chips) can use a full-pill radius to distinguish them from actionable buttons.

## Components

- **Buttons:** Primary buttons use the Emerald Green background with White text for "Revenue" actions; Midnight Blue for "System" actions. Use 8px padding-x for a compact, professional look.
- **Inputs:** Clean 1px Slate-300 borders. On focus, the border transitions to Action Blue with a 2px soft outer glow.
- **Cards:** White background, 1px Slate-200 border, and 16px padding. Titles within cards should use `label-md` to provide clear categorization.
- **Status Chips:** Small, rounded-full badges. Use Emerald for "Converted," Amber for "Follow-up," and Slate for "Archived."
- **Data Tables:** High-density layout. Use `body-sm` for row data. Every second row should have a subtle Slate-50 tint to improve horizontal scanning.
- **AI Insight Panels:** Distinctive components with a subtle Tertiary Blue gradient border and a small "Sparkle" icon to denote AI-generated revenue suggestions.
- **Flowcharts:** Use 2px Slate-300 lines with arrowheads. Connectors should be orthogonal (90-degree angles) to maintain the "Structured Data" aesthetic.