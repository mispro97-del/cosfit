# COSFIT Mobile Design Guide
## Premium K-Beauty AI Platform — Design System v1.0

> Target aesthetic: Hwahae app precision + Olive Young warmth + AI-tech sophistication
> Base constraint: max-width 440px, mobile-first, Noto Sans KR

---

## 1. Design Philosophy

### Brand Positioning

COSFIT is a **science-backed K-beauty companion**, not a shopping app. The visual language must communicate:

- **Trust through data**: AI analysis results must feel authoritative yet approachable
- **Warmth of K-beauty**: Soft terracotta palette, rounded forms, gentle gradients
- **Premium without intimidation**: Clean whitespace, editorial hierarchy, subtle luxury signals
- **Personal**: The app "knows" your skin — UI should feel curated, not generic

### Visual Language Principles

| Principle | Expression |
|-----------|-----------|
| **Warm minimalism** | Cream-white surfaces, terracotta accents, sparse decoration |
| **Layered depth** | Subtle shadows, glass-morphism header, surface hierarchy (bg > card > elevated) |
| **Data elegance** | FIT Score gauge, ingredient bars, breakdown chips — data is the hero |
| **Guided flow** | Progressive disclosure, one decision per screen, clear hierarchy |

### UX Tone and Personality

- **Voice**: Friendly expert — like a knowledgeable beauty editor giving advice
- **Feedback**: Immediate, satisfying micro-interactions on selection
- **Errors**: Warm, non-alarming — "let's fix this together" tone
- **Empty states**: Encouraging, actionable — never just blank

---

## 2. Updated Color System

### Core Tokens

```css
/* Brand / Primary */
--cosfit-brand:         #C4816A;   /* Terracotta — primary actions, active states */
--cosfit-brand-dark:    #A66B55;   /* Pressed state, gradient end */
--cosfit-brand-deep:    #8B4A36;   /* Hover on dark surfaces */
--cosfit-brand-light:   #E8D4CA;   /* Soft selection, chip selected bg */
--cosfit-brand-pale:    #F5EDE8;   /* Section tints, tag backgrounds */
--cosfit-brand-ghost:   #FBF5F2;   /* Hover surface */

/* Backgrounds — 3-level hierarchy */
--cosfit-bg-base:       #FDFBF9;   /* Page background */
--cosfit-bg-warm:       #F9F3ED;   /* Warm offset (summary cards, metadata) */
--cosfit-bg-card:       #FFFFFF;   /* Card / elevated surface */
--cosfit-bg-overlay:    rgba(253,251,249,0.92); /* Sticky header with blur */

/* Text — 4-level hierarchy */
--cosfit-text-primary:  #2D2420;   /* Headings, key data */
--cosfit-text-body:     #5A4F48;   /* Body text, descriptions */
--cosfit-text-secondary:#8B7E76;   /* Labels, meta info */
--cosfit-text-muted:    #B5AAA2;   /* Placeholders, timestamps */
--cosfit-text-disabled: #C5B8B1;   /* Disabled states */

/* Borders */
--cosfit-border:        #EDE6DF;   /* Default card/input border */
--cosfit-border-soft:   #F2EBE5;   /* Subtle dividers */
--cosfit-border-focus:  #C4816A;   /* Input focus ring */

/* Semantic — FIT Score Grades */
--cosfit-perfect:       #6B9E7D;   /* PERFECT / GOOD — emerald green */
--cosfit-perfect-bg:    #EDF5F0;
--cosfit-perfect-border:#6B9E7D26;

--cosfit-fair:          #C4A83D;   /* FAIR — warm amber */
--cosfit-fair-bg:       #FDF8E8;
--cosfit-fair-border:   #C4A83D26;

--cosfit-risk:          #D4665A;   /* POOR / RISK — warm coral red */
--cosfit-risk-bg:       #FDF0EE;
--cosfit-risk-border:   #D4665A26;

/* Semantic — Status */
--cosfit-success:       #6B9E7D;
--cosfit-success-bg:    #EDF5F0;
--cosfit-warning:       #D4A054;
--cosfit-warning-bg:    #FEF3CD;
--cosfit-error:         #C47070;
--cosfit-error-bg:      #FFF0EE;
--cosfit-info:          #5A8EC4;
--cosfit-info-bg:       #EEF4FB;
```

### Gradient Tokens

```css
/* Primary action gradient — used on main CTA button */
--gradient-brand:        linear-gradient(135deg, #C4816A 0%, #A66B55 100%);

/* Hero/brand panel gradient */
--gradient-hero:         linear-gradient(135deg, #C4816A 0%, #B5705A 50%, #8B4A36 100%);

/* Score gauge fill — matched to grade */
--gradient-perfect:      linear-gradient(135deg, #6B9E7D, #5A8A6C);
--gradient-fair:         linear-gradient(135deg, #C4A83D, #B89530);
--gradient-risk:         linear-gradient(135deg, #D4665A, #C05048);

/* Surface shimmer for loading skeleton */
--gradient-skeleton:     linear-gradient(90deg, #F5EDE8 25%, #FAF0EB 50%, #F5EDE8 75%);
```

### Surface Hierarchy (Visual Depth)

```
Level 0 — Page bg:   #FDFBF9 (base)
Level 1 — Warm bg:   #F9F3ED (sections, summary)
Level 2 — Card:      #FFFFFF + border #EDE6DF + shadow xs
Level 3 — Elevated:  #FFFFFF + border #C4816A/15 + shadow sm
Level 4 — Overlay:   #FFFFFF + shadow md (modals, tooltips)
```

---

## 3. Typography Scale

### Font Stack

```css
font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Size Scale (Mobile-optimized)

| Token | px | rem | Usage |
|-------|----|-----|-------|
| `text-[10px]` | 10 | 0.625 | Micro labels, timestamps |
| `text-xs` | 12 | 0.75 | Form labels, badges, meta tags |
| `text-[13px]` | 13 | 0.8125 | Body small, ingredient names |
| `text-sm` | 14 | 0.875 | Body default, list items |
| `text-[15px]` | 15 | 0.9375 | Subheadings, card titles |
| `text-base` | 16 | 1.0 | Section headings |
| `text-lg` | 18 | 1.125 | Page headings, score labels |
| `text-xl` | 20 | 1.25 | Step titles |
| `text-[22px]` | 22 | 1.375 | Onboarding step headers |
| `text-2xl` | 24 | 1.5 | Stat numbers |
| `text-3xl` | 30 | 1.875 | FIT Score hero number |
| `text-4xl` | 36 | 2.25 | Score gauge center |
| `text-5xl` | 48 | 3.0 | Brand logo, hero |

### Weight Usage

| Weight | Class | Usage |
|--------|-------|-------|
| 400 | `font-normal` | Body text, descriptions |
| 500 | `font-medium` | Ingredient names, tags |
| 600 | `font-semibold` | Labels, chip text, secondary headings |
| 700 | `font-bold` | Headings, button text |
| 800 | `font-extrabold` | Score numbers, stat figures |
| 900 | `font-black` | Brand logo, hero score |

### Line Height and Spacing

```css
/* Headings */
line-height: 1.2;   /* tight for large text */
letter-spacing: -0.02em; /* slight tightening for Korean weight */

/* Body */
line-height: 1.6;   /* comfortable reading */
letter-spacing: 0;

/* Labels / Micro */
line-height: 1.4;
letter-spacing: 0.02em; /* slight tracking for small uppercase */

/* Score numbers */
line-height: 1;     /* numeric only, no descenders */
letter-spacing: -0.03em;
```

---

## 4. Component Design Specs

### 4.1 Cards

#### Standard Card (History item, ingredient row)
```
Background:  #FFFFFF
Border:      1px solid #EDE6DF
Border-radius: 16px (rounded-2xl)
Shadow:      0 1px 4px rgba(45,36,32,0.04), 0 2px 12px rgba(45,36,32,0.06) on hover
Padding:     14px (p-3.5)
Transition:  shadow 200ms ease, transform 150ms ease
Hover:       transform: translateY(-1px)
```

Tailwind: `rounded-2xl border border-[#EDE6DF] bg-white p-3.5 transition-all hover:shadow-[0_4px_16px_rgba(45,36,32,0.08)] hover:-translate-y-px`

#### Warm Tint Card (Stats, summary)
```
Background:  #F9F3ED (warm)  or semantic tint
Border:      1px solid #EDE6DF or semantic/20
Border-radius: 16px
Padding:     14px
```

Tailwind (brand): `rounded-2xl border border-[#EDE6DF] bg-[#F5EDE8] p-3.5`

#### Elevated Card (Active section, FIT report accordion open)
```
Background:  #FFFFFF
Border:      1px solid #C4816A/20
Border-radius: 16px
Shadow:      0 4px 20px rgba(196,129,106,0.12)
```

Tailwind: `rounded-2xl border border-[#C4816A]/20 bg-white shadow-[0_4px_20px_rgba(196,129,106,0.12)]`

#### Score Badge Card (History list item left)
```
Width/Height: 48px x 48px
Border-radius: 12px (rounded-xl)
Background:  Grade semantic tint
Flex:        column center
```

### 4.2 Buttons

#### PrimaryButton (Main CTA) — UPGRADE from current
```
Height:      56px (py-4 + text-base = ~56px total)
Border-radius: 14px
Background:  linear-gradient(135deg, #C4816A 0%, #A66B55 100%)
Text:        white, 16px, font-bold
Shadow:      0 4px 16px rgba(196,129,106,0.35)
Hover:       shadow 0 6px 24px rgba(196,129,106,0.45), translateY(-1px)
Active:      scale(0.97)
Disabled:    bg-[#EDE6DF], text-[#B5AAA2], shadow-none, cursor-not-allowed
Loading:     spinner icon + "처리 중..." text
```

Tailwind: `w-full h-14 rounded-[14px] bg-gradient-to-br from-[#C4816A] to-[#A66B55] text-white text-base font-bold shadow-[0_4px_16px_rgba(196,129,106,0.35)] hover:shadow-[0_6px_24px_rgba(196,129,106,0.45)] hover:-translate-y-px active:scale-[0.97] transition-all duration-200`

#### SecondaryButton (Ghost / Outline)
```
Height:      48px
Border-radius: 12px
Background:  transparent
Border:      1.5px solid #EDE6DF
Text:        #8B7E76, 14px, font-semibold
Hover:       border-[#C4816A]/40, text-[#2D2420], bg-[#F9F3ED]
```

Tailwind: `h-12 px-5 rounded-xl border-[1.5px] border-[#EDE6DF] text-[#8B7E76] text-sm font-semibold hover:border-[#C4816A]/40 hover:text-[#2D2420] hover:bg-[#F9F3ED] transition-all duration-200`

#### FilterChip (grade filter pills)
```
Height:      32px (py-1.5)
Border-radius: 20px (rounded-2xl)
Border:      1px solid #EDE6DF
Text:        12px, font-semibold
Inactive:    bg-transparent, text-[#8B7E76]
Active:      bg-[grade color], text-white, border-transparent
Hover:       border-[#E8D4CA]
```

#### SkipButton
```
Height:      44px touch target
Text:        14px, text-[#B5AAA2]
Style:       text-only, underline-offset-4
Hover:       text-[#8B7E76]
```

#### Social Login Buttons
```
Height:      52px (py-3.5)
Border-radius: 14px
Border:      2px solid #EDE6DF
Google:      bg-white, border #EDE6DF, text-[#2D2420]
Kakao:       bg-[#FEE500], text-[#191919], font-bold, no-border
Hover Google: border-[#C4816A]/40, shadow-sm
```

### 4.3 Input Fields

#### Default State
```
Height:      52px (py-3.5 px-4)
Border-radius: 12px (rounded-xl)
Background:  #FFFFFF
Border:      2px solid #EDE6DF
Text:        14px, #2D2420
Placeholder: #C5B8B1
```

#### Focus State
```
Border:      2px solid #C4816A
Shadow:      0 0 0 3px rgba(196,129,106,0.12)
```

#### Error State
```
Border:      2px solid #C47070
Shadow:      0 0 0 3px rgba(196,112,112,0.10)
```

#### Filled/Dirty State
```
Border:      2px solid #EDE6DF
Background:  #FDFBF9
```

Tailwind base: `w-full py-3.5 px-4 rounded-xl border-2 border-[#EDE6DF] bg-white text-sm text-[#2D2420] placeholder:text-[#C5B8B1] focus:outline-none focus:border-[#C4816A] focus:ring-[3px] focus:ring-[#C4816A]/12 transition-all duration-200`

### 4.4 Badges / Tags

#### FIT Grade Badge (inline)
```
Padding:     2px 10px
Border-radius: 8px
Font:        11px, font-bold, letter-spacing 0.05em
Color:       Grade semantic color
Background:  Grade semantic bg tint
```

#### Safety Grade Tag
```
Padding:     2px 8px
Border-radius: 6px
Font:        11px, font-semibold
SAFE:        bg-[#EDF5F0], color-[#4A7A5C]
MODERATE:    bg-[#FDF8E8], color-[#8B7A2C]
CAUTION:     bg-[#FEF3CD], color-[#856404]
HAZARDOUS:   bg-[#FDF0EE], color-[#A34B42]
UNKNOWN:     bg-[#F0F0F0], color-[#888]
```

#### Category Pill (product type)
```
Padding:     4px 10px
Border-radius: 20px
Font:        11px, font-medium
Background:  #F5EDE8
Color:       #A66B55
```

#### New / AI Badge
```
Padding:     3px 8px
Border-radius: 6px
Font:        10px, font-bold, letter-spacing 0.08em
Background:  linear-gradient(135deg, #C4816A, #A66B55)
Color:       white
Text:        "AI" or "NEW"
```

### 4.5 Navigation Header

```
Height:      56px (h-14)
Background:  #FDFBF9/90 with backdrop-blur-xl
Border-bottom: 1px solid #EDE6DF
Position:    sticky top-0, z-50
Padding:     0 20px
Layout:      flex items-center justify-between

Logo: "COSFIT" — font-extrabold, tracking-tight, text-[#2D2420]
Back button: 44x44px touch target, text-[#8B7E76], ← arrow
Right slot: step counter, date, or action icon
```

Tailwind: `sticky top-0 z-50 h-14 px-5 bg-[#FDFBF9]/90 backdrop-blur-xl border-b border-[#EDE6DF] flex items-center justify-between`

#### Bottom Navigation Bar (for main app screens — add this)
```
Height:      72px + safe-area-inset-bottom
Background:  #FFFFFF/95 with backdrop-blur-md
Border-top:  1px solid #EDE6DF
Padding:     12px 0 + safe area
Items:       4 tabs — Home, Compare, History, Profile
Active tab:  icon + label in #C4816A
Inactive:    icon + label in #B5AAA2
Tab:         48px touch target min
```

### 4.6 Bottom Action Bar (Onboarding / Form flows)

```
Position:    fixed bottom-0, full width, max-w-[440px]
Padding:     12px 24px 28px (extra bottom for safe area)
Background:  linear-gradient(to top, #FDFBF9 70%, transparent)
z-index:     40
```

Tailwind: `fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-6 pb-7 pt-3 bg-gradient-to-t from-[#FDFBF9] via-[#FDFBF9]/95 to-transparent z-40`

### 4.7 Progress Indicators

#### ProgressDots (onboarding steps)
```
Active dot:  24px wide, 8px tall, #C4816A, rounded-full
Past dot:    8px wide, 8px tall, #E8D4CA, rounded-full
Future dot:  8px wide, 8px tall, #EDE6DF, rounded-full
Transition:  width 400ms ease, background 300ms ease
```

#### ProgressBar (product register count)
```
Track height: 4px, bg-[#EDE6DF], rounded-full
Fill:        gradient from-[#C4816A] to-[#A66B55], transition-width 600ms ease
```

### 4.8 Accordion

```
Container:   rounded-2xl, border #EDE6DF, bg-white, overflow-hidden, mb-3
Header:      px-4 py-3.5, flex items-center, gap-2.5
Title:       15px, font-semibold, text-[#2D2420]
Badge:       11px font-semibold, px-2 py-0.5, rounded-lg, semantic colors
Chevron:     text-[#B5AAA2], ▲/▼, 14px
Body:        px-4 pb-4, border-t border-[#EDE6DF]
Animation:   max-height 300ms ease, opacity 200ms ease
```

### 4.9 FIT Score Gauge (Circular SVG)

```
Outer ring:  r=54, stroke-width=10, color #EDE6DF
Score ring:  r=54, stroke-width=10, grade color, strokeLinecap=round
Size:        160x160px (w-40 h-40)
Animation:   stroke-dashoffset 1000ms ease-out on mount
Center text: score number (text-4xl font-black), grade label (text-xs tracking-widest)
```

**Upgrade**: Add a soft colored glow behind the gauge circle:
```
Glow layer: absolute inset-0, rounded-full, blur-xl, opacity-20, grade-color bg
```

---

## 5. Page-by-Page Design Specs

### 5.1 Login / Signup

**Background treatment:**
- Mobile: `bg-[#FDFBF9]` full screen
- The logo area needs visual weight — add a brand illustration or gradient pill behind "COSFIT"

**Mobile Login Page Structure (redesign):**
```
┌─────────────────────────────────┐
│  [Brand Hero Area]              │  h-52
│  Gradient bg: #C4816A → #8B4A36│
│  Centered: COSFIT (white, 5xl)  │
│  Subtitle: "내 피부를 위한 AI"  │
│  Bottom wave or fade into white  │
├─────────────────────────────────┤
│  [Form Card Area]               │
│  bg-white, rounded-t-[28px]     │
│  px-6, py-8                     │
│  Overlaps hero by -24px (pull-up)│
│                                 │
│  Type tabs (user/partner/admin) │
│  Email input                    │
│  Password input                 │
│  Error message                  │
│  [로그인] primary button        │
│  Divider "또는"                 │
│  Google / Kakao buttons         │
│  회원가입 link                  │
└─────────────────────────────────┘
```

**Key Tailwind classes for redesign:**
```
Hero: h-52 bg-gradient-to-br from-[#C4816A] via-[#B5705A] to-[#8B4A36] relative overflow-hidden flex items-end justify-center pb-16

Brand text: text-5xl font-black text-white tracking-tight

Form card: bg-white rounded-t-[28px] -mt-6 px-6 pt-8 pb-10 shadow-[0_-8px_40px_rgba(45,36,32,0.08)]

Tab group: flex gap-1 bg-[#F5EDE8] rounded-xl p-1 mb-6
Active tab: flex-1 py-2 text-xs font-bold rounded-lg bg-white text-[#C4816A] shadow-sm
```

**Animation approach:**
- Hero: `animate-fade-in-up 0.4s ease`
- Form card: `animate-[slideUp_0.5s_ease_0.1s_both]`
- Input focus: ring expand 200ms ease
- Button: scale + shadow on press

### 5.2 Onboarding (5-step wizard)

**Background treatment:**
- Always `bg-[#FDFBF9]` — clean, no distractions
- Step content area: `px-6 pt-6 pb-28` — ample bottom padding for fixed action bar

**Visual hierarchy per step:**

**Step header (StepHeader upgrade):**
```
Emoji:    64px, centered (text-6xl)
Title:    22px, font-bold, tight leading, text-[#2D2420]
Subtitle: 14px, text-[#8B7E76], leading-relaxed, max-w-[280px] mx-auto
Spacing:  emoji mb-4, title mb-2, subtitle mb-8
Animation: fadeInUp 0.5s ease 0.1s both
```

**ChipSelect upgrade:**
```
Each chip: min-height 48px (touch target), px-5 py-3, rounded-2xl
Active:    border-[#C4816A] bg-[#F5EDE8] text-[#A66B55] font-semibold
           + left accent bar: 3px wide, brand color, on icon side
Inactive:  border-[#EDE6DF] bg-white text-[#8B7E76]
Icon:      text-xl mr-2, not emoji-sized — keep it subtle
Layout:    grid-cols-2 for 4+ items, flex-wrap for 3 or fewer
```

**Sensitivity step (slider-style alternative):**
```
Instead of chips, use a 5-point visual scale:
Icons: 🌸 🌿 🌊 🔥 ⚡ representing sensitivity levels
Each: 60px x 80px card, selected gets brand color accent
Layout: flex gap-2 justify-between
```

**Products step:**
```
Search bar: 52px height, rounded-xl, icon inside
Results:    cards with image placeholder (emoji category icon in 48px box)
Selected:   horizontally scrollable pill strip with ×remove, above search
Progress:   ProgressBar showing X/5 slots filled
```

**AnalyzingScreen:**
```
Full screen, bg-[#FDFBF9]
Centered animation:
  - 80px pulsing COSFIT logo or sparkle icon
  - Text rotating: "성분 분석 중..." → "패턴 매칭 중..." → "결과 생성 중..."
  - Subtitle: "AI가 당신의 피부 기준을 분석하고 있어요"
  - Dots animation at bottom
Duration: fake progress 3s → complete callback
```

**CompletionScreen:**
```
Success badge: 80px, gradient bg, white checkmark
Title: "분석 완료!" — text-2xl font-black
Subtitle: confidence score card
CTA: "분석 결과 보기 →" button
```

**ProgressDots placement:**
```
Below header, above content — px-6 py-3
Use updated dot spec from Section 4.7
```

### 5.3 History Page

**Background treatment:**
- Page: `bg-[#FDFBF9]`
- Stats row: three warm-tinted cards (existing design is good, needs shadow upgrade)

**Page header (add above stats):**
```
py-4 px-0 (inside main layout)
Title: "분석 기록" — text-xl font-bold text-[#2D2420]
Subtitle: "총 N개의 분석" — text-sm text-[#8B7E76]
```

**Stats cards upgrade:**
```
Current design is correct in structure — upgrade:
- Add: shadow-[0_2px_8px_rgba(45,36,32,0.04)]
- Add: hover:shadow-[0_4px_16px_rgba(45,36,32,0.08)] hover:-translate-y-px
- Number: text-2xl font-extrabold (keep, it's correct)
- Label: text-[11px] font-medium text-[#8B7E76]
```

**Filter chips row:**
```
Horizontal scroll, no scrollbar
Gap: 6px
Each chip: h-8, px-3.5, rounded-2xl, text-xs font-semibold
Active: grade color solid bg, white text
Inactive: bg-transparent, border-[#EDE6DF], text-[#8B7E76]
```

**History item cards (upgrade):**
```
Add hover: translateY(-1px) + shadow increase
Score badge: w-12 h-12 rounded-xl (keep)
Product name: truncate with ellipsis (keep)
Brand · Category: keep format, upgrade category display:
  - Remove emoji from body text, use a small colored category pill instead
Metrics row: keep ✅ and ⚠️ counts, upgrade timestamp to "2일 전" relative time
Arrow: use a proper Chevron icon (›) or SVG, sized 16px
```

**Empty state:**
```
Icon: large SVG illustration or 64px emoji in soft tinted circle
Primary text: "아직 분석 기록이 없어요" — text-base font-semibold
Secondary: "화장품을 분석해보세요" — text-sm text-[#8B7E76]
CTA button: secondary style, "분석 시작하기"
```

**Loading state:**
```
Skeleton cards: 3x cards with shimmer animation
Shimmer: bg-gradient-to-r from-[#F5EDE8] via-[#FAF0EB] to-[#F5EDE8]
         background-size: 400px, animation: shimmer 1.5s ease infinite
```

### 5.4 Compare Report Page

**Background treatment:**
- Full `bg-[#FDFBF9]`
- Score hero section: add a soft radial gradient glow behind gauge
- Sections separated by warm bg tints

**Hero section (upgrade):**
```
Product info row (top):
  - Category icon: 40px colored circle bg (grade tint), emoji inside
  - Product name: text-base font-bold
  - Brand · Category: text-[13px] text-[#8B7E76]

Score gauge (center):
  - Keep SVG circle approach
  - ADD: soft glow div behind SVG — absolute, rounded-full, blur-2xl, grade-color/20
  - Score number: text-4xl font-black (upgrade from current)
  - Grade label: text-xs font-bold tracking-widest
  - Grade message: text-[15px] font-medium text-[#5A4F48]

Confidence badge: keep, add subtle shadow
```

**Breakdown chips:**
```
Layout: flex gap-2 justify-center
Each chip: px-4 py-2.5 rounded-xl
Base score: blue-tinted
Bonus: green-tinted
Risk: red-tinted
Values: text-base font-bold (keep)
Labels: text-[11px] text-[#8B7E76]
```

**Summary card:**
```
bg-[#F9F3ED] border border-[#EDE6DF] rounded-2xl p-4
Text: text-[13px] text-[#5A4F48] leading-[1.7]
Add: left border accent — 3px, #C4816A, rounded-full
```

**Accordions:**
```
Keep current structure, upgrade:
- Section icon: 24px in colored 32px circle, not raw emoji
- Open state: elevated shadow (0 4px 20px rgba(C4816A, 0.08))
- Body reveal animation: max-height 300ms ease
```

**Ingredient cards (good/risk):**
```
Good: bg-[#EDF5F0] border border-[#6B9E7D]/10
Risk: bg-[riskBg] border border-[riskColor]/20
Impact/penalty badge: colored pill, right-aligned
Position badge: "1번째 · 상위 함량" — chips in warm tint
```

**Metadata row:**
```
Horizontal flex, gap-5, wrap allowed
bg-[#F9F3ED] rounded-xl p-3
Each: label text-[10px] text-[#B5AAA2] uppercase, value text-[13px] font-semibold
```

### 5.5 User Layout (Header / Navigation)

**Current layout issues:**
- No bottom navigation → user can't tab between sections
- Header just shows "COSFIT" text — no context or user identity
- `max-w-lg` (512px) vs content using `max-w-[440px]` — inconsistency

**Header redesign:**
```
Height: 56px
Logo: "COSFIT" left-aligned, font-extrabold text-[20px] text-[#2D2420]
Right side: UserAvatar (32px circle) or notification bell
Max-width: max-w-[440px] mx-auto (match content)
```

**Add Bottom Navigation:**
```
Tabs:
  1. 홈 / Home — grid icon
  2. 비교 / Compare — layers icon
  3. 기록 / History — clock icon
  4. 내정보 / My — user icon

Active:  icon + label in #C4816A
Inactive: icon only (#B5AAA2), label hidden or muted
Active tab: small dot indicator above icon or solid fill icon
```

---

## 6. Mobile UX Patterns

### 6.1 Touch Target Sizes

- **Minimum touch target**: 44x44px for all interactive elements
- Chips: min-height 44px on onboarding, 32px for filter chips (acceptable — scrollable context)
- Back button: 44x44 with invisible padding (`p-3 -ml-3`)
- List items: min-height 64px
- Accordion headers: min-height 52px

### 6.2 Scrolling Behaviors

```css
/* Hide scrollbars on filter chips row */
.filter-scroll { scrollbar-width: none; }
.filter-scroll::-webkit-scrollbar { display: none; }

/* Smooth scroll for ingredient lists */
.ingredient-list { scroll-behavior: smooth; }

/* Overscroll elastic feel on iOS */
body { overscroll-behavior-y: contain; }
```

### 6.3 Animation / Transition System

```
Page entry:      fadeInUp, 0.4s ease, stagger 50ms per item
Step transition: fadeSlideLeft (forward) / fadeSlideRight (back), 0.35s ease
List items:      fadeInUp, stagger: index * 50ms, 0.3s ease
Accordion:       max-height 0 → auto, 300ms ease
Number counters: count-up animation on history stats, 800ms
Score gauge:     stroke-dashoffset from circumference → value, 1000ms ease-out
Buttons:         scale(0.97) on active, 150ms ease
Skeleton:        shimmer loop, 1.5s linear infinite
```

### 6.4 Loading States

#### Page loading (History, Report)
```
Structure: 3 skeleton cards that match real card dimensions
Shimmer: animated gradient sweep left-to-right
Duration: until data resolves
```

#### Button loading
```
Replace text with: spinner (16px) + "처리 중..."
Spinner: border-2 border-white/30 border-t-white, rounded-full, spin 1s linear
Disable pointer events, reduce opacity to 80%
```

#### AI analyzing screen
```
Full page overlay, not inline
Pulsing brand icon (scale 1 → 1.08 → 1, 2s ease infinite)
Rotating text messages every 1.5s
Fake progress bar: 0% → 90% in 3s, then snap to 100% on complete
```

### 6.5 Empty States

#### History empty
```
Icon: 64px "✨" in 96px circle bg-[#F5EDE8]
Title: "아직 분석 기록이 없어요" — text-base font-semibold text-[#2D2420]
Desc:  "화장품 성분을 분석하고\n나만의 FIT 기록을 만들어보세요" — text-sm text-[#8B7E76] text-center
CTA:   SecondaryButton "분석 시작하기"
Spacing: py-20, items centered
```

#### No results (filter empty)
```
Smaller treatment: py-12
Icon: 36px emoji in 48px tint circle
Text: "해당 등급의 분석 결과가 없어요" — text-sm text-[#B5AAA2]
```

### 6.6 Error States

#### Form field error
```
Border: 2px solid #C47070
Helper text: text-xs text-[#C47070] mt-1.5 ml-1
Icon: ⚠️ or X icon before text
```

#### Page-level error
```
Card: bg-[#FFF0EE] border border-[#C47070]/30 rounded-xl p-4
Icon: 24px warning in #C47070
Title: "오류가 발생했어요" — text-[15px] font-semibold text-[#C47070]
Desc: error message — text-sm text-[#8B7E76]
CTA: "다시 시도하기" in secondary button style
```

#### Network error (toast pattern)
```
Position: fixed top-4 left-4 right-4, max-w-[400px] mx-auto
bg-[#2D2420] text-white rounded-xl p-4
Icon: wifi-off icon left
Text: "연결을 확인해주세요" right
Auto-dismiss: 3s
Animation: slideDown from top, fadeOut on dismiss
```

---

## 7. Design Tokens Implementation

### Tailwind Config Additions

```js
// tailwind.config.js additions
theme: {
  extend: {
    colors: {
      cosfit: {
        // existing brand tokens...

        // ADD: semantic surface tokens
        "surface": "#FFFFFF",
        "surface-warm": "#F9F3ED",
        "surface-ghost": "#FBF5F2",

        // ADD: text hierarchy
        "text-body": "#5A4F48",

        // ADD: semantic status
        "perfect": "#6B9E7D",
        "perfect-bg": "#EDF5F0",
        "fair": "#C4A83D",
        "fair-bg": "#FDF8E8",
        "info": "#5A8EC4",
        "info-bg": "#EEF4FB",
      }
    },
    borderRadius: {
      "2.5xl": "20px",
      "3xl": "24px",
    },
    boxShadow: {
      "card": "0 1px 4px rgba(45,36,32,0.04), 0 2px 8px rgba(45,36,32,0.04)",
      "card-hover": "0 4px 16px rgba(45,36,32,0.08)",
      "brand-sm": "0 4px 16px rgba(196,129,106,0.30)",
      "brand-md": "0 6px 24px rgba(196,129,106,0.40)",
      "overlay": "0 8px 40px rgba(45,36,32,0.12)",
    },
    keyframes: {
      shimmer: {
        "0%": { backgroundPosition: "-400px 0" },
        "100%": { backgroundPosition: "400px 0" },
      },
      slideUp: {
        from: { opacity: "0", transform: "translateY(24px)" },
        to: { opacity: "1", transform: "translateY(0)" },
      },
    },
    animation: {
      shimmer: "shimmer 1.5s linear infinite",
      "slide-up": "slideUp 0.5s ease both",
    },
  }
}
```

### globals.css Additions

```css
/* Shimmer skeleton utility */
.skeleton {
  background: linear-gradient(
    90deg,
    #F5EDE8 25%,
    #FAF0EB 50%,
    #F5EDE8 75%
  );
  background-size: 400px 100%;
  animation: shimmer 1.5s linear infinite;
}

/* iOS safe area support */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

/* Smooth scrolling for list containers */
.scroll-smooth-x {
  overflow-x: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.scroll-smooth-x::-webkit-scrollbar { display: none; }
```

---

## 8. Component Mapping for Next.js Implementation

| Current Component | Design Upgrade | Priority |
|------------------|----------------|----------|
| `PrimaryButton` | Add h-14, gradient, shadow-brand-sm | HIGH |
| `ChipSelect` | Add min-h-[44px], grid layout option | HIGH |
| `StepHeader` | Add text-6xl emoji, max-w subtitle | MEDIUM |
| `ProgressDots` | Already correct spec | LOW |
| `ProgressBar` | Add rounded-full track | LOW |
| `SkipButton` | Add 44px touch target | MEDIUM |
| `UserLayout` | Add BottomNav component | HIGH |
| NEW: `GradeBadge` | Semantic color by grade | HIGH |
| NEW: `SafetyBadge` | Safety grade coloring | MEDIUM |
| NEW: `SkeletonCard` | Shimmer loading state | HIGH |
| NEW: `BottomNav` | 4-tab navigation | HIGH |
| NEW: `Toast` | Error/success notifications | MEDIUM |
| NEW: `SecondaryButton` | Outline variant | MEDIUM |

---

## 9. Quick Reference: Key Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Max width | 440px | Standard mobile web, avoids iPad stretch |
| Border radius base | 16px (rounded-2xl) | Friendly, modern K-beauty aesthetic |
| Card border | 1px #EDE6DF | Subtle, warm, not harsh gray |
| Primary gradient | #C4816A → #A66B55 | Brand depth, prevents flat look |
| Body font size | 14px | Comfortable Korean reading density |
| Touch target min | 44px | iOS HIG standard |
| Animation duration | 300-500ms | Responsive but not jarring |
| Backdrop blur | xl (24px) | Premium glassmorphism header feel |
| Score gauge stroke | 10px | Bold enough to read, not chunky |
| Empty state icon | 64px in 96px circle | Enough visual weight, not overwhelming |
