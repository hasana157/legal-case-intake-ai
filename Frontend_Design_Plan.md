# OPPOSING-ARGUMENT SIMULATOR
## DETAILED FRONTEND DESIGN PLAN
### Interactive Anime/Character-Based UI Architecture

**Design Lead**: Frontend Architecture Team  
**Date**: July 2026  
**Status**: Design Specification Ready for Development

---

## DESIGN PHILOSOPHY & AESTHETIC VISION

### The Core Insight
This is not a traditional legal app. It's a **practice arena**—a space where self-represented litigants mentally rehearse their confrontation before entering court. We're designing for courage, clarity, and confidence.

**Aesthetic Direction**: **Visual Novel Meets Battle Simulator**
- Inspired by anime/manga visual novel UI conventions
- Character-driven interface (user as protagonist, opponent as AI character)
- Dialogue/confrontation format reflects the actual litigation experience
- Progressive, game-like flow (intake → preparation → practice → export)
- Vibrant, energetic color palette (not intimidating legal grays/blacks)
- Playful micro-interactions that encourage repeated practice

**Why This Works**:
1. **Thematic appropriateness**: Litigation IS adversarial, so game/battle metaphor is honest, not frivolous
2. **Psychological benefit**: Gamification reduces anxiety; turns daunting task into manageable practice
3. **Engagement loop**: Characters + dialogue encourage multiple iterations ("play again")
4. **Accessibility**: Anime/visual novel UI is globally recognized; lowers cognitive load for non-tech users

---

## DESIGN SYSTEM: TOKENS & COMPONENTS

### 1. COLOR PALETTE
```
PRIMARY SPECTRUM (Opponent/Challenge):
  Opponent Red:      #EF5350 (approaching argument - energetic, not threatening)
  Opponent Dark:     #C62828 (citations, authority)
  
SECONDARY SPECTRUM (User/Defense):
  User Blue:         #42A5F5 (protagonist color - calm, strategic)
  User Dark:         #1565C0 (user's citations, notes)
  
ACCENT & ENERGY:
  Victory Gold:      #FFD54F (success states, confidence)
  Caution Orange:    #FB8C00 (warnings, disclaimers)
  
NEUTRALS:
  Light BG:          #F8FAFC (soft, reduces eye strain)
  Dark BG:           #0F172A (deep blue-black, not pure black)
  Card White:        #FFFFFF (elevated surfaces)
  Text Dark:         #1E293B (readable, not harsh)
  Text Light:        #64748B (secondary text, balanced)
  
SEMANTIC:
  Success Green:     #4CAF50 (verification passed, citations verified)
  Warning Yellow:    #FFC107 (low confidence, needs review)
  Error Red:         #F44336 (hallucination detected, citation failed)
```

### 2. TYPOGRAPHY SYSTEM

#### Display Face (Characterful, Minimal Use)
**Font**: "Shuuematt" or "Manrope Bold" (futuristic, slightly anime-inspired)
- **Purpose**: Section headers, character names, dramatic moments
- **Usage**: 
  - Page titles: 48px / 56px
  - Character introduction: 36px
  - Challenge headers: 28px
  - All uppercase, letter-spacing +2px for impact

#### Body Face (Readable, Professional)
**Font**: "Inter" or "Segoe UI" (clean, geometric, excellent readability)
- **Purpose**: All body text, instructions, arguments
- **Sizes**:
  - Body text: 16px / 1.6 line-height
  - Small text / captions: 14px / 1.5 line-height
  - Code / citations: 13px (monospace, Fira Code)
  - Labels: 14px / 0.875 tracking

#### Accent Face (Data/Citations)
**Font**: "Fira Code" (monospace, lawyer-ready)
- **Purpose**: Case citations, statute references, legal authority
- **Size**: 12px-14px, with syntax-highlighting

---

## PAGE-BY-PAGE DESIGN SPECIFICATION

### PAGE 1: LANDING / HERO
**Purpose**: Immediate orientation + engagement hook

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Logo] OPPOSING-ARGUMENT SIMULATOR                         │
│         Practice Your Case Against an AI Opponent           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 👤 YOU       │  │ ⚖️  PRACTICE │  │ 🎯 MASTER    │      │
│  │ Prepare Your │  │ Against an   │  │ Your Case    │      │
│  │ Case         │  │ AI Opponent  │  │ Before Court │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MANDATORY DISCLAIMER                               │   │
│  │ This tool provides educational practice only.      │   │
│  │ Not a substitute for attorney representation.      │   │
│  │ [I Understand & Continue]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [START YOUR CASE] ← Large CTA button (Blue)        │  │
│  │  ← Or watch 2-min demo video (embedded)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

DESIGN DETAILS:
- Hero image: Split-screen character art
  Left side: Confident protagonist (you)
  Right side: Stern opposing counsel character
  Between them: ⚖️ scales icon with VS text
  
- Color: Light gradient background (F8FAFC → E8EEFA)
- Disclaimer: Persistent, non-dismissible, orange accent border
- CTA Button: 
  * Size: 56px tall, full width (desktop), fixed width (mobile)
  * Color: User Blue #42A5F5
  * Text: White, bold (Manrope)
  * Hover: Darker blue + subtle glow effect
  * Animation: Gentle pulse on page load (1.5s cycle)
```

**Key Features**:
- ✅ Character-driven visual (anime-style character art)
- ✅ 3-step value prop (visually distinct cards)
- ✅ Mandatory disclaimer (orange border, can't skip)
- ✅ Hero CTA button with micro-animation
- ✅ Optional demo video (builds confidence before commitment)

---

### PAGE 2: CASE INTAKE WIZARD
**Purpose**: Structured, guided narrative collection with character dialogue

```
╔════════════════════════════════════════════════════════════╗
║  STEP 1 / 4: YOUR STORY                                   ║
║                                                            ║
║  [Progress bar: ███░░░░░░ 25%]                            ║
║                                                            ║
║  ┌─ CHARACTER INTRO (Anime-style character portrait)  ─┐  ║
║  │                                                      │  ║
║  │  👤 "Tell me about your case. I'm here to help      │  ║
║  │      you prepare. Start with what happened."        │  ║
║  │                                                      │  ║
║  └──────────────────────────────────────────────────────┘  ║
║                                                            ║
║  📝 FREE-TEXT NARRATIVE INPUT                              ║
║  ┌────────────────────────────────────────────────────┐    ║
║  │ [Character limit: 0/1500] (Light countdown)        │    ║
║  │                                                    │    ║
║  │ [Large textarea with anime-style border]          │    ║
║  │ "I rented an apartment in 2024... The landlord    │    ║
║  │  claimed I damaged the walls. I did not. I need   │    ║
║  │  to prove..."                                     │    ║
║  │                                                    │    ║
║  └────────────────────────────────────────────────────┘    ║
║                                                            ║
║  💡 TIPS SIDEBAR (Collapsible)                             ║
║  ┌─ What to include: ─────────────────────────────────┐    ║
║  │ • Key dates (when did X happen?)                   │    ║
║  │ • Who is involved (you, opponent, witnesses)       │    ║
║  │ • What is disputed (what does opponent claim?)     │    ║
║  │ • What evidence do you have? (documents, proof)    │    ║
║  └────────────────────────────────────────────────────┘    ║
║                                                            ║
║  ┌─────────────────── [Next: Choose Claim Type] ────────┐  ║
║  │ [Previous]                            [Next →]      │  ║
║  └───────────────────────────────────────────────────────┘  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

STEP 2 / 4: CLAIM TYPE & JURISDICTION
┌────────────────────────────────────────────────────────┐
│  What type of case is this?                           │
│  [Dropdown with icons]                                │
│  🏠 Housing / Tenancy Dispute                         │
│  👨‍⚖️ Small Claims                                     │
│  👪 Family Law Dispute                                │
│  ⚠️  Consumer Dispute                                  │
│  📋 Other (specify)                                   │
│                                                        │
│  Which jurisdiction?                                  │
│  [Searchable dropdown showing state/federal options] │
│  Selected: Ohio (State)                               │
│                                                        │
│  [Next →]                                             │
└────────────────────────────────────────────────────────┘

STEP 3 / 4: KEY FACTS EXTRACTION
┌────────────────────────────────────────────────────────┐
│  "Thanks! I've identified key details from your       │
│   narrative. Please confirm or edit:"                 │
│                                                        │
│  📅 DATE RANGE                                         │
│  From: [2024-01-15] To: [2024-06-20]                  │
│                                                        │
│  👥 PARTIES INVOLVED                                  │
│  Plaintiff (You): [John Smith]                        │
│  Defendant: [Sarah's Apartments LLC]                  │
│  Witnesses: [Roommate], [Building Manager]            │
│                                                        │
│  📚 DISPUTED FACTS                                     │
│  ☐ Wall damage severity                               │
│  ☐ Responsibility for damage                          │
│  ☐ Security deposit refund                            │
│                                                        │
│  📎 AVAILABLE EVIDENCE                                 │
│  ☑️ Photos of walls (before lease)                     │
│  ☑️ Lease agreement (copy)                             │
│  ☐ Witness statement (need to gather)                 │
│                                                        │
│  [Edit] [Next →]                                      │
└────────────────────────────────────────────────────────┘

STEP 4 / 4: REVIEW & READY TO PRACTICE
┌────────────────────────────────────────────────────────┐
│  ✅ Your case is ready!                               │
│                                                        │
│  CASE SUMMARY                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Housing Dispute (Ohio State Court)              │  │
│  │ Plaintiff: John Smith v. Sarah's Apartments LLC │  │
│  │ Period: Jan 2024 - Jun 2024                     │  │
│  │                                                 │  │
│  │ Your Position:                                  │  │
│  │ "I did not damage the walls. The landlord      │  │
│  │  is wrongfully withholding my security        │  │
│  │  deposit."                                      │  │
│  │                                                 │  │
│  │ Evidence Strength: 6/10                         │  │
│  │ [Pro tip: Collect witness statements for +2]   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  👤 YOUR OPPONENT (AI-Powered Character)               │
│  "I'm opposing counsel. I'll present the strongest    │
│   counterarguments you're likely to face. Ready to    │
│   practice?"                                          │
│                                                        │
│  🎯 [START PRACTICE] ← Primary CTA (Blue)             │
│  ← or [Edit My Case]                                  │
└────────────────────────────────────────────────────────┘
```

**Design Details**:

#### Character & Dialogue
- **Character Portrait**: Anime-style opposing counsel character (stern, professional)
- **Dialogue Bubbles**: Comic-style speech bubbles with character portrait on left
- **Character Consistency**: Same character across all pages (builds familiarity)

#### Input Elements
- **Text Areas**: Anime-style border (colored accent, rounded, 2px), light shadow on focus
- **Dropdowns**: Icon-based options, custom styling (not browser default)
- **Progress Bar**: Animated, color changes per step (Step 1 = Blue, Step 2 = Blue, Step 3 = Gold, Step 4 = Green)

#### Typography
- **Headers**: "Manrope" bold, 28px, sentence case
- **Body**: "Inter" 16px, 1.6 line-height
- **Labels**: 14px, slight letter-spacing

#### Micro-Interactions
- On input focus: Smooth color transition, left border highlights (User Blue)
- Character portrait: Subtle breathing animation (up/down 2px, 3s cycle)
- Progress bar: Smooth fill animation when advancing
- Validation: Real-time checkmarks appear next to confirmed fields

---

### PAGE 3: PRACTICE ARENA (MAIN EVENT)
**Purpose**: Interactive debate/discussion view; user practices rebuttals in real-time

```
╔════════════════════════════════════════════════════════════╗
║                     PRACTICE ARENA                         ║
║  John Smith v. Sarah's Apartments LLC (Ohio)              ║
║                                                            ║
║  [← Back]                              [Print Guide] [Exit]║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │                                                     │  ║
║  │  YOUR POSITION (Left Panel - User Blue)             │  ║
║  │  ┌──────────────────────────────────────────────┐   │  │
║  │  │ 👤 YOU (Plaintiff)                           │   │  │
║  │  │                                              │   │  │
║  │  │ "I did not damage the walls. I lived        │   │  │
║  │  │  carefully, and I have photos proving the   │   │  │
║  │  │  walls were already damaged when I moved    │   │  │
║  │  │  in. The landlord is wrongfully keeping my  │   │  │
║  │  │  security deposit."                         │   │  │
║  │  │                                              │   │  │
║  │  └──────────────────────────────────────────────┘   │  │
║  │                                                     │  │
║  │  📎 YOUR EVIDENCE                                   │  │
║  │  ✅ Lease agreement (entry date: Jan 2024)          │  │
║  │  ✅ Photos (move-in inspection, walls unmarked)     │  │
║  │  ⚠️  Witness statement (gather this)                │  │
║  │                                                     │  │
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  VS ⚡ DEBATE SEPARATOR                                   ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │                                                     │  ║
║  │  OPPONENT'S CHALLENGE (Right Panel - Opponent Red) │  │
║  │  ┌──────────────────────────────────────────────┐   │  │
║  │  │ 👤 OPPOSING COUNSEL (AI-Simulated)           │   │  │
║  │  │                                              │   │  │
║  │  │ "Your Honor, the plaintiff's claim is       │   │  │
║  │  │  unconvincing. Consider these points:"      │   │  │
║  │  │                                              │   │  │
║  │  │  1. LACK OF PHOTOGRAPHIC EVIDENCE           │   │  │
║  │  │     The plaintiff claims to have photos,    │   │  │
║  │  │     but did not provide them with the lease │   │  │
║  │  │     application. Under Ohio landlord law    │   │  │
║  │  │     (Ohio Rev. Code § 5321.05), the burden  │   │  │
║  │  │     of proof is on the tenant to document   │   │  │
║  │  │     pre-existing damage *within 30 days*.   │   │  │
║  │  │     No evidence of timely notice.           │   │  │
║  │  │     [Citation: Stivers v. Linden (1982)]   │   │  │
║  │  │                                              │   │  │
║  │  │  2. PROCEDURAL DEFECT: NO PROPER NOTICE     │   │  │
║  │  │     Tenant did not provide written notice   │   │  │
║  │  │     to landlord within statutory period.    │   │  │
║  │  │     [Citation: Ohio 5321.04 - Notice Req]   │   │  │
║  │  │                                              │   │  │
║  │  │  3. WITNESS ISSUE                           │   │  │
║  │  │     Opposing counsel will demand to speak   │   │  │
║  │  │     with witnesses independently.           │   │  │
║  │  │     Prepare for deposition.                 │   │  │
║  │  │                                              │   │  │
║  │  │ Confidence: HIGH ⭐⭐⭐                       │   │  │
║  │  │                                              │   │  │
║  │  └──────────────────────────────────────────────┘   │  │
║  │                                                     │  │
║  │  📋 CITATIONS VERIFIED (✅ 100%)                     │  │
║  │  All arguments grounded in retrieved case law.     │  │
║  │                                                     │  │
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  YOUR REBUTTAL (Interactive Input)                        ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  🎤 YOUR COUNTER-ARGUMENT                          │  │
║  │                                                     │  │
║  │  ┌───────────────────────────────────────────────┐  │  │
║  │  │ [Textarea - Light blue border on focus]      │  │  │
║  │  │ _________________________________             │  │  │
║  │  │ [Word count: 0/500]                          │  │  │
║  │  │                                              │  │  │
║  │  │ Enter your response to the above challenge. │  │  │
║  │  │ Refer to your evidence. Cite the law if you │  │  │
║  │  │ can. [Pro tip: "I have documented proof..."] │  │  │
║  │  │                                              │  │  │
║  │  └───────────────────────────────────────────────┘  │  │
║  │                                                     │  │
║  │  ┌─────────────────────────────────────────────┐   │  │
║  │  │ [Save Rebuttal] [Generate New Challenge]   │   │  │
║  │  │ [Review Again] [Next Challenge] →           │   │  │
║  │  └─────────────────────────────────────────────┘   │  │
║  │                                                     │  │
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  💡 CONTEXT PANEL (Collapsible - Right Sidebar)           ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │ 📚 LEGAL CONTEXT                                   │  │
║  │                                                     │  │
║  │ Relevant Case Law (from opponent's argument):      │  │
║  │                                                     │  │
║  │ ▶ Stivers v. Linden, 58 Ohio St. 2d 313 (1982)   │  │
║  │   Key Holding: Tenant must notify landlord        │  │
║  │   within 30 days of move-in to dispute pre-       │  │
║  │   existing damage...                              │  │
║  │   [Read full opinion ↗]                           │  │
║  │                                                     │  │
║  │ ▶ Ohio Rev. Code § 5321.04 (Notice of Defects)   │  │
║  │   Tenant's right to repair and deduct...          │  │
║  │   [Read statute ↗]                                │  │
║  │                                                     │  │
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Design Details**:

#### Layout Structure
- **Split-Screen Debate**: Left (User Blue) vs. Right (Opponent Red)
- **VS Separator**: Horizontal line with ⚡ icon (energy, confrontation)
- **Full Width on Mobile**: Stacks vertically (User argument → Opponent challenge → Rebuttal)

#### Character Dialogue Styling
- **Speech Bubbles**: Comic-style, colored backgrounds (blue for user, red for opponent)
- **Character Portrait**: Small circular avatar (30x30px) in corner of bubble
- **Corner Indicator**: Subtle directional triangle pointing to/from character

#### Argument Display (Animated Streaming)
```
Opponent's argument streams character-by-character:
- Each sentence appears with slight delay (50-100ms between blocks)
- Confidence badge (⭐⭐⭐ HIGH / ⭐⭐ MEDIUM / ⭐ LOW) appears last
- Citation verification checkmarks (✅) appear inline as argument streams
```

#### Rebuttal Input
- **Text Area**: Light blue (#E3F2FD) background, darker blue (#42A5F5) border on focus
- **Character Counter**: Appears bottom-right, light gray (#90CAF9)
- **Suggestions**: As user types, subtle autocomplete hints appear (gray, non-intrusive)

#### Action Buttons
- **Generate New Challenge**: Orange (#FB8C00) - restart debate with new angle
- **Save Rebuttal**: Green (#4CAF50) - commit response to session
- **Next Challenge**: Blue (#42A5F5) - advance to next opposing argument

#### Micro-Interactions
- **Streaming Animation**: Text appears smoothly, letter-by-letter
- **Citation Highlighting**: When cursor hovers over citation, highlighted and right panel auto-expands
- **Button Hover**: Subtle scale-up (1.02x) + shadow increase
- **Confidence Badge Pulse**: Subtle opacity fade-in (0.5s)

---

### PAGE 4: EXPORT & REVIEW
**Purpose**: PDF generation + session summary before user leaves

```
╔════════════════════════════════════════════════════════════╗
║          EXPORT YOUR HEARING REHEARSAL GUIDE               ║
║                                                            ║
║  ✅ Your practice session is complete!                     ║
║                                                            ║
║  SESSION SUMMARY                                           ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ Case: John Smith v. Sarah's Apartments LLC         │   ║
║  │ Jurisdiction: Ohio State Court                     │   ║
║  │ Challenges Faced: 4                                │   ║
║  │ Rebuttals Drafted: 4                               │   ║
║  │ Time Spent: 18 minutes                             │   ║
║  │ Preparedness Score: 7/10                           │   ║
║  │ ► Consider gathering witness statements for +2    │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║  📥 DOWNLOAD OPTIONS                                       ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │                                                    │   ║
║  │  📄 [Download as PDF]                              │   ║
║  │     'Hearing_Rehearsal_Guide.pdf'                  │   ║
║  │     Contains: Case facts, all 4 challenges,        │   ║
║  │     your rebuttals, legal citations               │   ║
║  │                                                    │   ║
║  │  📋 [Copy to Clipboard]                            │   ║
║  │     Markdown format, paste into any app            │   ║
║  │                                                    │   ║
║  │  🔗 [Share Session Link]                           │   ║
║  │     (Create shareable link for attorney review)   │   ║
║  │                                                    │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║  💡 TIPS FOR HEARING PREP                                  ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ • Print this guide and bring to hearing            │   ║
║  │ • Practice reading your rebuttals aloud 3x         │   ║
║  │ • Prepare to cite specific case law if challenged  │   ║
║  │ • Anticipate questions about missing evidence      │   ║
║  │ • Arrive 15 minutes early to compose yourself      │   ║
║  │                                                    │   ║
║  │ Need more help? Consult a local legal aid office.  │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║  🔄 CONTINUE PRACTICING                                    ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ [Edit This Case & Practice Again]                 │   ║
║  │ [Start a New Case]                                │   ║
║  │ [View Saved Sessions]                             │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║  ⚖️  FINAL DISCLAIMER                                      ║
║  This tool provides educational practice only and is not   ║
║  a substitute for qualified attorney representation.       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Design Details**:

#### Session Summary Card
- **Background**: Light gradient (F8FAFC → E8EEFA)
- **Border**: Left accent bar (#42A5F5 blue) 4px
- **Content**: Clean, scannable layout (labels in gray, values in dark)
- **Preparedness Score**: Visual bar chart (0-10 scale), color gradient (red → yellow → green)

#### Download Buttons
- **Primary (PDF)**: Large blue button, full width
- **Secondary Options**: Outlined buttons below
- **Icons**: Simple, recognizable icons for each format

#### Congratulations Messaging
- **Emoji**: ✅ check mark (positive, accomplished feeling)
- **Font**: Manrope bold, 24px
- **Color**: Success green or gold accent

#### Tips Section
- **Styled List**: Checkmarks before each tip, light background (F0F4F8)
- **Emphasis**: Actionable, concrete language

---

## RESPONSIVE DESIGN BREAKPOINTS

### Desktop (>1200px)
- Full split-screen debate layout
- Right sidebar context panel always visible
- Sidebar sticky on scroll

### Tablet (768px - 1199px)
- Split-screen stacks vertically
- Opponent challenge above rebuttal area
- Context panel toggles below

### Mobile (<768px)
- Single column layout
- Character names sticky at top of each section
- Full-width input areas
- Buttons stack vertically
- Reduced font sizes (12px body, 20px headers)

---

## ANIMATION & MICRO-INTERACTIONS

### Page Load Animations
```
Timeline:
0ms     -> Disclaimer overlay fades in (300ms)
300ms   -> Character portrait slides from left (400ms, ease-out)
400ms   -> Title text fades in (300ms)
700ms   -> Hero button pulse begins (infinite, 1.5s cycle)
```

### Streaming Text Animation
```
LLM response streams character by character:
- Appear at 50ms intervals
- Slight stagger between sentences (+100ms)
- Fade-in duration: 50ms
- Citation links highlight green when appearing
```

### Button Interactions
```
Hover:     Scale 1.02x + shadow increase + color lighten (150ms)
Active:    Scale 0.98x (80ms press effect)
Focus:     Outline: 2px blue (#42A5F5) with 4px offset
Disabled:  Opacity 0.6, cursor: not-allowed
```

### Input Focus
```
Text Area:
  Border color: Gray #CBD5E0 → Blue #42A5F5 (150ms)
  Background: #FFFFFF → #F0F7FF (150ms)
  Shadow: 0 0 0 -> 0 0 0 8px rgba(66, 165, 245, 0.1) (150ms)
  Cursor: Blink animation (standard)
```

### Success State
```
When citation verified:
  ✅ checkmark appears (fade-in 200ms)
  Background flash: green tint (100ms, then fade)
  Slight pulse on checkmark (300ms)
```

---

## ACCESSIBILITY & INCLUSIVE DESIGN

### WCAG 2.1 AA Compliance

#### Color Contrast
- All text: Minimum 4.5:1 contrast ratio (meets AA)
- UI components: Minimum 3:1 contrast ratio
- Color not sole indicator (always paired with icons/text)

#### Keyboard Navigation
- Tab order: Logical, top-to-bottom, left-to-right
- All interactive elements: Visible focus indicator (2px outline, blue)
- Shortcuts: Alt + S (Start), Alt + N (Next), Alt + E (Export)
- Focus trap: Disclaimer overlay (can't tab past)

#### Screen Reader Support
- Semantic HTML: <button>, <label>, <fieldset>, etc.
- ARIA labels: All icon buttons have aria-label
- ARIA live regions: Streamed arguments announced with aria-live="polite"
- Form labels: Associated with <label for="id">

#### Motion
- Respects prefers-reduced-motion media query
- Fallback: All animations disabled for users with vestibular disorders
- No flashing (no more than 3 flashes/second)

#### Font & Spacing
- Minimum font size: 14px (body)
- Line height: Minimum 1.5
- Letter spacing: Minimum 0.12em (at default size)
- Word spacing: Minimum 0.16em
- Line length: Maximum 80 characters (readability)

---

## DESIGN TOKENS (CSS VARIABLES)

```css
/* Colors */
--color-primary-user: #42A5F5;        /* User/You */
--color-primary-opponent: #EF5350;    /* Opponent */
--color-accent-gold: #FFD54F;         /* Success/Victory */
--color-accent-warning: #FB8C00;      /* Caution */
--color-neutral-bg: #F8FAFC;          /* Light background */
--color-neutral-dark-bg: #0F172A;     /* Dark background */
--color-text-dark: #1E293B;           /* Primary text */
--color-text-light: #64748B;          /* Secondary text */
--color-border: #E2E8F0;              /* Subtle borders */

/* Typography */
--font-display: 'Manrope', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'Fira Code', monospace;

--font-size-hero: 48px;
--font-size-h1: 36px;
--font-size-h2: 28px;
--font-size-h3: 24px;
--font-size-body: 16px;
--font-size-small: 14px;
--font-size-tiny: 12px;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;

/* Border Radius */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

---

## COMPONENT LIBRARY

### 1. Character Dialogue Bubble
```tsx
<DialogueBubble 
  character="opponent"
  text="Your Honor, consider..."
  isStreaming={true}
  confidence="HIGH"
  citations={[{case: "Stivers v. Linden", verified: true}]}
/>

// Renders:
- Character portrait (circular avatar)
- Colored background (red for opponent, blue for user)
- Streaming text animation
- Confidence badge
- Inline citation links with [↗] open icon
```

### 2. Split-Screen Debate Layout
```tsx
<DebateArena>
  <Column side="user" color="blue">
    {userArgument}
  </Column>
  <Divider icon="⚡" />
  <Column side="opponent" color="red">
    {opponentArgument}
  </Column>
</DebateArena>
```

### 3. Input with Counter
```tsx
<TextAreaWithCounter
  placeholder="Your rebuttal..."
  maxLength={500}
  showCharCount={true}
  onInput={handleInput}
/>

// Shows character count at bottom-right, color changes as approaching limit
```

### 4. Progress Wizard
```tsx
<WizardProgress currentStep={1} totalSteps={4} />
// Animated progress bar, step labels below
```

### 5. Disclaimer Overlay (Non-Dismissible)
```tsx
<MandatoryDisclaimer 
  title="IMPORTANT LEGAL NOTICE"
  content="This tool is NOT a substitute..."
  acceptText="I Understand & Continue"
  onAccept={handleAccept}
/>
// Cannot close or skip; must accept to proceed
```

---

## USER FLOWS & INTERACTION PATTERNS

### Flow 1: First-Time User (Onboarding)
```
Landing Page 
  → Read disclaimer & click [Understand]
  → Case Intake Wizard (Step 1: Narrative)
  → Case Intake Wizard (Step 2: Claim Type & Jurisdiction)
  → Case Intake Wizard (Step 3: Extract Key Facts)
  → Case Intake Wizard (Step 4: Review & Start)
  → Practice Arena (First Challenge Generates)
  → User Drafts Rebuttal
  → [Next Challenge] or [Generate New Challenge]
  → Export & Review Session
```

### Flow 2: Experienced User (Iteration)
```
Landing Page
  → [Start] (disclaimer already accepted)
  → Choose: [New Case] or [Load Previous Session]
  → If New: Rapid Case Intake (text + jurisdiction)
  → Practice Arena
  → Multiple challenges until confident
  → Export & Review
```

### Flow 3: Attorney Review (Secondary User)
```
Litigant generates PDF/shareable link
  → Attorney opens PDF or clicks link
  → Reviews litigant's arguments & rebuttals
  → Provides feedback (in comments or side-by-side)
  → Litigant returns to Practice Arena for refinement
```

---

## PERFORMANCE & TECHNICAL OPTIMIZATION

### Frontend Performance
- **First Contentful Paint (FCP)**: <1.5s
- **Largest Contentful Paint (LCP)**: <2.5s
- **Cumulative Layout Shift (CLS)**: <0.1

### Optimization Strategies
1. **Code Splitting**: Lazy-load Practice Arena component
2. **Image Optimization**: WebP format for character art, ~50KB per image
3. **Streaming**: SSE for LLM responses (no blocking wait)
4. **CSS-in-JS**: Emotion or Styled Components for minimal bundle
5. **Bundle Size**: Target <150KB gzipped (Next.js optimized)

### Dark Mode (Optional Enhancement)
```css
@media (prefers-color-scheme: dark) {
  --color-neutral-bg: #0F172A;
  --color-neutral-dark-bg: #1E293B;
  --color-text-dark: #F1F5F9;
  /* Adjust colors for readability in dark mode */
}
```

---

## DESIGN SYSTEM DECISION RATIONALE

| Decision | Choice | Why |
|----------|--------|-----|
| **Color Palette** | Vibrant anime (red/blue/gold) | Matches brief; energetic & encouraging; thematically appropriate for confrontation |
| **Character UI** | Anime-style portraits + dialogue bubbles | Reduces legal intimidation; makes AI feel like a coach/opponent, not a system |
| **Layout** | Split-screen debate | Visually mirrors litigation; easy comparison of positions |
| **Typography** | Manrope (display) + Inter (body) | Manrope is geometric & futuristic (anime-inspired); Inter is optimized for readability |
| **Animation** | Streaming text + button micro-interactions | Streaming builds anticipation; micro-interactions provide feedback without over-animation |
| **Disclaimer** | Non-dismissible overlay | Critical safety requirement; can't be ignored or forgotten |
| **Mobile-First** | Responsive stacking | Litigation is urgent; users may access on phone while prepping |

---

## DEVELOPMENT PRIORITIES (Phased Rollout)

### Phase 1 (MVP)
- ✅ Landing page with disclaimer
- ✅ 4-step case intake wizard
- ✅ Practice Arena with opponent streaming text
- ✅ Rebuttal text area
- ✅ Basic export to PDF
- ⏳ Accessibility: Keyboard nav + screen reader basics

### Phase 2 (Polish)
- ✅ Character animations (breathing, portrait)
- ✅ Full WCAG AA compliance
- ✅ Dark mode support
- ✅ Mobile optimization
- ✅ Citation verification UI feedback
- ✅ Session persistence (localStorage)

### Phase 3 (Advanced)
- ✅ Multi-argument challenges (3-5 per session)
- ✅ Evidence strength scoring
- ✅ Attorney review flow
- ✅ Analytics dashboard (aggregate only, no PII)
- ✅ A/B testing for onboarding variants

---

## SUCCESS METRICS (Design KPIs)

| Metric | Target | Reasoning |
|--------|--------|-----------|
| **Time to First Challenge** | <2min | User gets value quickly (reduces bounce) |
| **Rebuttal Completion Rate** | >70% | Users complete at least 1 practice response |
| **PDF Download Rate** | >60% | Users export guide (sign of commitment) |
| **Return User Rate** | >40% | Users come back for more practice |
| **Mobile Usage** | >30% | Mobile optimization essential |
| **Accessibility Audit** | WCAG AA 100% | Legal obligation; inclusive design |
| **Time on Site (Avg)** | >12 min | Indicates engagement depth |
| **Error Rate (UI)** | <1% | Smooth, glitch-free experience |

---

## FINAL DESIGN STATEMENT

The Opposing-Argument Simulator UI is **not a legal product dressed up in anime clothing**—it's a **practice arena designed for human courage**. 

By grounding the interface in familiar anime/visual novel conventions (character dialogue, progressive challenges, energy/progression aesthetics), we transform a daunting legal task into an accessible, repeatable practice session. The user is the protagonist. The opponent is a challenging character (not a threat, but a worthy sparring partner). Each rebuttal drafted is a victory checkpoint.

This design honors both the **gravity of litigation** (mandatory disclaimers, citation verification, serious color accents) and the **accessibility need** (encouraging UI, playful interactions, supportive character voice). The result is an interface that feels like practicing for a speech or debate—which, fundamentally, is what litigation is.

---

**Prepared by**: Frontend Design Team  
**For**: Hasana Zahid, COMSATS University Islamabad  
**Date**: July 2026  
**Status**: Ready for Development ✅
