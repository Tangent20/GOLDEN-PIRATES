{
  "project": {
    "scope": "Rebuild only the Home page #postuler section: left pitch column + right single-page recruitment form card + full-screen success overlay. Keep existing pirate theme + Tailwind tokens. No multi-step wizard.",
    "audience": "Call of Dragons mobile gamers (FR/EN), impatient, mostly mobile; optimize for completion in ~60 seconds.",
    "conversion_principles": [
      "Single scroll, no steps. Use strong grouping + progressive disclosure inside the same card (conditional fields) to feel short.",
      "Front-load fun/identity (pseudo + power + rank/activity chips), keep contact minimal and optional.",
      "Always show progress perception: ‘≈ 60 secondes’ chip + compact sections + sticky submit affordance on mobile."
    ]
  },

  "visual_personality": {
    "keywords": ["100% pirate", "parchment + brass", "wax seal finality", "tactical + fast"],
    "do_not_change_palette": true,
    "existing_tokens_to_use": {
      "colors": ["ink", "deck", "parch", "gold (#D4AF37)", "goldlight", "bone", "mist", "blood", "bloodglow", "bloodhot"],
      "fonts": ["font-display (Pirata-style)", "font-fell (IM Fell serif)", "font-mono2 (tracking-wide mono labels)"],
      "utilities": ["frame-plate", "brass-porthole", "wax-seal", "gold-ingot"]
    },
    "texture_rules": {
      "parchment": "Use subtle map-grid + grain-layer overlays only on section backgrounds or card chrome; never behind dense text blocks.",
      "metal": "Use brass-porthole ring for status dots, chips, and small counters; keep it as border/shadow, not large gradients.",
      "blood_accents": "Reserve blood/bloodglow for errors, cooldown state, and rare emphasis (<= 5% of UI)."
    }
  },

  "design_tokens_css": {
    "instructions": "Add/extend CSS custom properties in /app/frontend/src/index.css under :root ONLY if needed; keep existing HSL vars. Prefer Tailwind classes using existing theme tokens. Avoid transition: all.",
    "recommended_additions": {
      "--gp-ease": "cubic-bezier(0.16, 1, 0.3, 1)",
      "--gp-shadow-card": "0 14px 40px -18px rgba(212,175,55,0.22)",
      "--gp-shadow-inset": "inset 0 0 0 1px rgba(212,175,55,0.22), inset 0 0 40px rgba(0,0,0,0.65)",
      "--gp-radius-card": "12px",
      "--gp-radius-chip": "9999px"
    }
  },

  "typography": {
    "font_usage": {
      "display_titles": "font-display (Pirata One) for section title + overlay title.",
      "body": "font-fell for helper text, microcopy, bullets.",
      "labels_meta": "font-mono2 for labels, status, tracking code, availability result."
    },
    "size_hierarchy_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "body": "text-sm sm:text-base",
      "small": "text-xs sm:text-sm"
    },
    "mobile_input_font_rule": "All inputs/textarea must be text-[16px] on mobile to prevent iOS zoom (already enforced globally; still set explicit classes on inputs).",
    "copy_tone": {
      "style": "French pirate, short, tactical. Avoid long paragraphs.",
      "patterns": [
        "Use verbs + outcome: ‘Scelle ta candidature’, ‘Vérifier’, ‘Copier le code’.",
        "Trust microcopy: ‘Pas de Discord ? Aucun souci.’",
        "Error tone: firm but helpful: ‘Ce pseudo est déjà actif. Essaie une variante.’"
      ]
    }
  },

  "layout_blueprint": {
    "section_container": {
      "outer": "section#postuler relative",
      "max_width": "max-w-7xl mx-auto",
      "padding": "px-4 sm:px-6 lg:px-8 py-10 sm:py-14",
      "grid": "grid gap-8 lg:gap-10 lg:grid-cols-[1.05fr_0.95fr] items-start"
    },
    "left_column_pitch": {
      "stack_order_mobile": "Pitch first, form second (keeps context).",
      "elements": [
        {
          "name": "eyebrow",
          "classes": "font-mono2 uppercase tracking-[0.22em] text-mist text-xs",
          "content": "Postuler — Recrutement"
        },
        {
          "name": "title",
          "classes": "mt-2 text-bone text-glow-gold",
          "content": "Monte à bord."
        },
        {
          "name": "migration_banner_countdown",
          "classes": "mt-4 frame-plate rounded-lg bg-deck/40 border border-gold/25 p-4",
          "notes": "Include countdown + short urgency line; keep it 2 lines max."
        },
        {
          "name": "intro",
          "classes": "mt-4 text-bone/85 text-sm sm:text-base max-w-prose",
          "content": "≈ 60 secondes. Pas de piège. On lit tout."
        },
        {
          "name": "trust_chip",
          "classes": "mt-4 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-ink/40 px-3 py-1 text-xs font-mono2 text-bone/80",
          "content": "≈ 60 secondes"
        },
        {
          "name": "3_promises",
          "classes": "mt-5 space-y-2 text-sm text-bone/80",
          "bullets": [
            "Réponse sous 72h (si tu es éligible)",
            "Zéro spam — contact uniquement pour ta candidature",
            "Pas de Discord obligatoire"
          ]
        }
      ]
    },
    "right_column_form_card": {
      "card_shell": "frame-plate rounded-[var(--gp-radius-card)] bg-parch/10 border border-gold/25",
      "card_padding": "p-4 sm:p-5 lg:p-6",
      "header": {
        "classes": "flex items-start justify-between gap-3",
        "left": "Title + tiny subtitle",
        "right": "Draft status + Clear link"
      },
      "spacing_rhythm": "Use section blocks with mt-5/6; inside blocks use gap-2.5 to feel fast."
    }
  },

  "form_field_set_minimal": {
    "goal": "~6 inputs total, rest via chips/segmented controls. Conditional contact keeps it short.",
    "fields": [
      {
        "id": "player-pseudo",
        "type": "text",
        "label": "Pseudo en jeu",
        "required": true,
        "helper": "Exact. Sans décorations.",
        "behavior": "On blur or 500ms debounce: pseudo availability check -> states: free / already active / accepted / cooldown.",
        "ui": "Input + status pill on the right (brass-porthole dot + label)."
      },
      {
        "id": "player-power",
        "type": "number",
        "label": "Puissance",
        "required": true,
        "helper": "Ex: 8 000 000",
        "behavior": "Quick chips: 6M, 8M, 10M, 15M, 20M+. Live band hint below (e.g., ‘Bande: 8–10M’).",
        "ui": "Input + chips row (wrap)"
      },
      {
        "id": "troop-rank",
        "type": "chips",
        "label": "Rang",
        "required": true,
        "options": ["R4", "R3", "R2", "R1"],
        "ui": "ToggleGroup single"
      },
      {
        "id": "activity",
        "type": "chips",
        "label": "Activité",
        "required": true,
        "options": ["Très actif", "Actif", "Casual", "Retour"],
        "ui": "ToggleGroup single"
      },
      {
        "id": "contact-channel",
        "type": "segmented",
        "label": "Contact",
        "required": false,
        "options": ["Discord", "Autre", "Aucun"],
        "conditional": {
          "Discord": "Show one input: Discord tag or username",
          "Autre": "Show one input: Telegram/WhatsApp/in-game contact",
          "Aucun": "Show helper text only: ‘On te répondra en jeu si possible.’"
        }
      },
      {
        "id": "message",
        "type": "textarea",
        "label": "Message (10 caractères min)",
        "required": true,
        "helper": "2 lignes suffisent.",
        "behavior": "Starter chips prepend text (3–4).",
        "starter_chips": [
          "Je cherche une guilde stable et active.",
          "Je peux être présent aux events.",
          "Je viens de migrer / je migre bientôt.",
          "Mon objectif: progresser vite."
        ]
      },
      {
        "id": "oath",
        "type": "checkbox",
        "label": "Je jure de jouer fair-play et de respecter le conseil.",
        "required": true,
        "ui": "shadcn Checkbox"
      }
    ],
    "submit": {
      "label": "Sceller ma candidature",
      "style": "Single primary gold-ingot button with wax-seal icon/mark; no secondary CTA competing.",
      "note": "Disable until required fields valid; show inline errors, not toast-only."
    }
  },

  "component_specs": {
    "chip_style": {
      "base_classes": "inline-flex items-center justify-center rounded-full border border-gold/25 bg-ink/35 px-3 py-2 text-[13px] sm:text-sm font-mono2 text-bone/85",
      "hover": "hover:bg-ink/55 hover:border-gold/40 transition-colors duration-200",
      "active": "data-[state=on]:bg-gold/15 data-[state=on]:border-gold/70 data-[state=on]:text-bone",
      "focus": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
      "wrap": "flex flex-wrap gap-2"
    },
    "segmented_control": {
      "implementation": "Use shadcn ToggleGroup (single) styled as segmented control. Add a subtle sliding indicator via absolute element if desired; keep it lightweight for mobile.",
      "container_classes": "relative grid grid-cols-3 rounded-full border border-gold/25 bg-ink/35 p-1",
      "item_classes": "rounded-full px-3 py-2 text-[13px] font-mono2 text-bone/75 data-[state=on]:text-bone data-[state=on]:bg-gold/15 transition-colors duration-200",
      "motion": "If adding indicator: animate translateX with Framer Motion spring (stiffness ~420, damping ~34)."
    },
    "availability_pill": {
      "placement": "Right side of pseudo input (or below on very small widths).",
      "states": {
        "free": {"dot": "bg-goldlight", "text": "Libre"},
        "active": {"dot": "bg-bloodhot", "text": "Déjà actif"},
        "accepted": {"dot": "bg-gold", "text": "Déjà accepté"},
        "cooldown": {"dot": "bg-blood", "text": "Cooldown"}
      },
      "classes": "inline-flex items-center gap-2 rounded-full border border-gold/20 bg-ink/40 px-3 py-1 text-xs font-mono2 text-bone/80"
    },
    "draft_autosave": {
      "behavior": [
        "Silent autosave to localStorage after 600–900ms debounce on any change.",
        "Indicator text: ‘Brouillon sauvé’ with tiny brass dot; show for 2s after save then fade to ‘Brouillon’.",
        "Provide ‘Effacer’ link/button (ghost) to clear draft."
      ],
      "classes": {
        "indicator": "inline-flex items-center gap-2 text-xs font-mono2 text-mist",
        "dot": "h-2 w-2 brass-porthole bg-gold/40"
      }
    },
    "errors": {
      "pattern": "Inline under field, not at top. Use aria-live polite region for first error summary only on submit.",
      "classes": "mt-1 text-xs text-bloodglow font-mono2",
      "input_error_ring": "ring-2 ring-blood/60 border-blood/60"
    }
  },

  "mobile_first_behavior": {
    "stacking": [
      "On mobile: pitch collapses to compact (eyebrow + title + 3 promises). Keep form immediately visible.",
      "Use sticky bottom submit bar ONLY if form height > viewport; otherwise keep button at end. Sticky bar must not cover inputs; add pb-safe + padding bottom."
    ],
    "sticky_submit_bar": {
      "classes": "lg:hidden fixed bottom-0 left-0 right-0 pb-safe bg-ink/92 backdrop-blur border-t border-gold/20",
      "inner": "max-w-7xl mx-auto px-4 py-3 flex items-center gap-3",
      "content": "Primary button + tiny ‘≈ 60s’ + draft status"
    },
    "touch_targets": "All chips/segments/buttons min-h-[44px] on coarse pointers (already globally enforced).",
    "safe_area": "Overlay and sticky bars must include pb-safe/pt-safe utilities."
  },

  "success_overlay": {
    "type": "Full-screen overlay (Dialog or custom fixed layer) with internal scroll; height: 100dvh.",
    "structure": {
      "backdrop": "fixed inset-0 bg-ink/80 backdrop-blur-sm",
      "panel": "relative mx-auto my-0 h-screen-dvh w-full max-w-2xl overflow-hidden frame-plate border border-gold/25",
      "scroll_area": "h-full overflow-y-auto pb-safe",
      "top": "Close button (top-right), keep reachable with thumb on mobile.",
      "hero": "Wax seal emblem + title ‘Candidature scellée’",
      "tracking_code": "GP-1023-XXXX displayed BIG in mono, centered, with brass-porthole border.",
      "actions": ["Copier", "Suivre ma candidature"],
      "what_now": [
        "Garde ton code (il ouvre ton dossier)",
        "Réponse sous 72h si éligible",
        "Si ‘Aucun contact’, surveille tes MP en jeu"
      ],
      "note": "Mention 72h wait note in muted text."
    },
    "hierarchy_classes": {
      "code": "mt-4 rounded-xl border border-gold/30 bg-deck/40 px-4 py-4 text-center font-mono2 text-2xl sm:text-3xl tracking-[0.18em] text-bone",
      "copy_button": "bg-gold text-ink font-mono2 rounded-lg px-4 py-3",
      "follow_button": "border border-gold/30 bg-ink/40 text-bone rounded-lg px-4 py-3"
    },
    "micro_interactions": [
      "On open: slight scale-in (0.98->1) + fade, 220ms ease using --gp-ease.",
      "On copy: button label changes to ‘Copié’ for 1.2s + subtle spark (no confetti).",
      "Trap focus; initial focus on tracking code container for easy copy (but do not auto-select text on iOS; provide explicit copy)."
    ]
  },

  "motion_principles": {
    "library": "Framer Motion available.",
    "rules": [
      "Use motion for perceived speed: small fades/slides only (y: 6–10px).",
      "No continuous animations inside the form except tiny status dot pulse for ‘saving…’.",
      "Respect prefers-reduced-motion (already globally handled)."
    ],
    "recommended_presets": {
      "section_enter": "initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.22,ease:[0.16,1,0.3,1]}}",
      "chip_press": "whileTap={{scale:0.98}}",
      "seal_press": "whileTap={{scale:0.97}} transition={{type:'spring',stiffness:520,damping:34}}"
    }
  },

  "accessibility": {
    "requirements": [
      "All inputs have <Label> and aria-describedby for helper/error.",
      "Inline errors: role='alert' for field error text; summary uses aria-live='polite'.",
      "Keyboard: ToggleGroup supports arrow keys; ensure focus-visible ring is not clipped by overflow-hidden containers.",
      "Color contrast: bone text on ink/deck/parch backgrounds; blood only for errors.",
      "Do not rely on color alone for availability state: include text label + icon/dot."
    ]
  },

  "component_path": {
    "shadcn_primary": {
      "Input": "/app/frontend/src/components/ui/input.jsx",
      "Textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "Checkbox": "/app/frontend/src/components/ui/checkbox.jsx",
      "Button": "/app/frontend/src/components/ui/button.jsx",
      "Card": "/app/frontend/src/components/ui/card.jsx",
      "ToggleGroup": "/app/frontend/src/components/ui/toggle-group.jsx",
      "Dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "ScrollArea": "/app/frontend/src/components/ui/scroll-area.jsx",
      "Sonner": "/app/frontend/src/components/ui/sonner.jsx"
    },
    "notes": "Project uses .jsx/.js; keep examples in JS (no TSX)."
  },

  "data_testids": {
    "section": {
      "postuler-root": "postuler-root",
      "postuler-pitch": "postuler-pitch",
      "postuler-form": "postuler-form"
    },
    "form": {
      "pseudo-input": "recruit-form-pseudo-input",
      "pseudo-availability-pill": "recruit-form-pseudo-availability",
      "power-input": "recruit-form-power-input",
      "power-chip-6m": "recruit-form-power-chip-6m",
      "power-chip-8m": "recruit-form-power-chip-8m",
      "power-chip-10m": "recruit-form-power-chip-10m",
      "power-chip-15m": "recruit-form-power-chip-15m",
      "power-chip-20m-plus": "recruit-form-power-chip-20m-plus",
      "rank-toggle": "recruit-form-rank-toggle",
      "rank-option-r4": "recruit-form-rank-option-r4",
      "rank-option-r3": "recruit-form-rank-option-r3",
      "rank-option-r2": "recruit-form-rank-option-r2",
      "rank-option-r1": "recruit-form-rank-option-r1",
      "activity-toggle": "recruit-form-activity-toggle",
      "activity-option-very-active": "recruit-form-activity-option-very-active",
      "activity-option-active": "recruit-form-activity-option-active",
      "activity-option-casual": "recruit-form-activity-option-casual",
      "activity-option-return": "recruit-form-activity-option-return",
      "contact-segment": "recruit-form-contact-segment",
      "contact-option-discord": "recruit-form-contact-option-discord",
      "contact-option-other": "recruit-form-contact-option-other",
      "contact-option-none": "recruit-form-contact-option-none",
      "contact-input": "recruit-form-contact-input",
      "message-textarea": "recruit-form-message-textarea",
      "message-starter-chip-1": "recruit-form-message-starter-chip-1",
      "message-starter-chip-2": "recruit-form-message-starter-chip-2",
      "message-starter-chip-3": "recruit-form-message-starter-chip-3",
      "message-starter-chip-4": "recruit-form-message-starter-chip-4",
      "oath-checkbox": "recruit-form-oath-checkbox",
      "submit-button": "recruit-form-submit-button",
      "draft-indicator": "recruit-form-draft-indicator",
      "draft-clear-button": "recruit-form-draft-clear-button",
      "error-summary": "recruit-form-error-summary"
    },
    "success_overlay": {
      "overlay-root": "recruit-success-overlay",
      "tracking-code": "recruit-success-tracking-code",
      "copy-code-button": "recruit-success-copy-button",
      "follow-application-button": "recruit-success-follow-button",
      "close-overlay-button": "recruit-success-close-button"
    }
  },

  "image_urls": {
    "note": "No new palette; avoid large gradients. Prefer CSS textures already present (map-grid, grain-layer). If imagery is needed, use subtle parchment/rope textures as background only.",
    "categories": [
      {
        "category": "optional_background_texture",
        "description": "Very subtle parchment texture for the #postuler section background overlay (opacity 0.04–0.07).",
        "urls": []
      }
    ]
  },

  "instructions_to_main_agent": [
    "Rebuild #postuler as a 2-column layout (lg+) with pitch left and form card right; mobile stacks with pitch condensed.",
    "Implement single-page form with grouped blocks and conditional contact field; no wizard/steps.",
    "Use ToggleGroup for chips + segmented control; style per chip_style tokens.",
    "Add pseudo availability check UI states (free/active/accepted/cooldown) with pill + dot; do not rely on color only.",
    "Implement silent draft autosave to localStorage with indicator + clear.",
    "Success overlay: full-screen fixed, 100dvh, internal scroll, big tracking code + Copy + Follow buttons; include wax seal visual.",
    "Ensure iOS Safari: inputs text-[16px], touch targets >=44px, safe-area padding, no layout shift.",
    "Add data-testid to every interactive element listed above.",
    "Do not change global palette; reuse existing utilities (frame-plate, gold-ingot, wax-seal, brass-porthole)."
  ],

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
