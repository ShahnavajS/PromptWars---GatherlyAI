# Gatherly design system

## Direction

Gatherly is an inviting planning studio for weddings, birthdays, community gatherings, and family celebrations. The product should feel like preparing a meaningful occasion with a capable friend: warm, calm, optimistic, and organized. Editorial imagery creates emotion at entry points; working screens prioritize clarity and control.

## Visual language

- **Canvas:** warm paper `#f8f5ee`; **ink:** deep green-charcoal `#263b34`; **muted ink:** `#596860`; **surface:** ivory-white `#fffefa`; **line:** `#e4e7dc`.
- **Action:** forest `#285942` with white text; **action hover:** `#1e4734`; **accent:** terracotta `#9e4b35`; **soft accent:** `#f5e6d9`; **sage:** `#e8efe5`; **gold:** `#e9c980`.
- Rose, apricot, mint, and lavender may distinguish event types; they are backgrounds, never the only state cue.
- Heading font: local Georgia/Times serif with generous leading. UI font: system sans. Numeric data uses tabular numerals.
- Use spacious page rhythm: 24–40px between related panels, 56–96px between major sections. Limit long text lines to ~65 characters.
- Corner radius: 12px for controls, 20px for cards, 28px for hero surfaces. Shadows are subtle; borders define the working UI.

## Components and behavior

- Primary actions are solid forest, secondary actions are outlined or light sage. Text actions use underline on hover and a clear focus ring.
- Forms have visible labels, helper text where needed, error messages linked to fields, and comfortable minimum 44px control height.
- Workspace navigation exposes selected state through text, background, and `aria-pressed`; mobile navigation wraps or scrolls without clipping content.
- Data cards emphasize one useful number and plain-language context. Avoid developer terms, emoji as icons, and claims about invisible implementation details.
- Progress bars always pair with a numeric text value. Empty states tell the organizer what to do next.
- AI suggestions are visually marked as proposals and require deliberate review before applying them.

## Motion and media

- The generated editorial photograph is decorative context for the landing experience. Keep all copy in HTML, never in the image.
- Use short entrance and hover transitions on `opacity` and `transform` only; no scroll hijacking, autoplay video, or essential information hidden behind animation.
- Respect `prefers-reduced-motion: reduce`. The static state must look complete.
- Avoid heavy 3D/WebGL in the planning workspace; it adds load and distracts from budgets, dates, and decisions.

## Responsive and accessible defaults

- Start with one column at narrow widths; expand to split layouts only with enough room for readable labels and values.
- Use semantic headings, native controls, visible focus, a skip link, readable contrast, and target sizes at or above 44px where practical.
- Check 320px reflow, 200% text zoom, keyboard order, dialog focus, and reduced-motion behavior manually before release.

## Guardrails

- Do not copy a reference brand's logo, exact color system, or layout. Gatherly's visual identity is its own.
- Do not imply that Gatherly books vendors, sends invitations, handles payments, or guarantees AI outputs.
- Keep all event types equally welcome. Wedding imagery and language must not dominate the product.
