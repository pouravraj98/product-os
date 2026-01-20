# Product OS

AI-powered feature prioritization system that helps product teams make data-driven decisions. Integrates with Linear to sync issues, score them using AI (GPT-4/Claude), and push calculated priorities back.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCT OS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐ │
│   │  Linear │────▶│  Sync Engine │────▶│  AI Scoring │────▶│  Dashboard  │ │
│   │   API   │     │              │     │  (GPT-4/    │     │             │ │
│   └─────────┘     └──────────────┘     │   Claude)   │     └─────────────┘ │
│        ▲                               └─────────────┘            │        │
│        │                                                          │        │
│        └──────────────────────────────────────────────────────────┘        │
│                           Push Priorities                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

- **Linear Integration**: Sync issues and projects from Linear
- **AI-Powered Scoring**: Use GPT-4 and/or Claude to analyze and score features
- **Master Source Integration**: AI scoring uses comprehensive product documentation for context-aware decisions
- **Multiple Frameworks**: Support for Weighted, RICE, ICE, Value-Effort, and MoSCoW
- **Customizable Weights**: Configure scoring factors for your team's priorities
- **Priority Sync**: Push calculated priorities back to Linear
- **First-Time Onboarding**: Guided setup wizard for new users

## Quick Start

### Prerequisites

- Node.js 18+
- Linear API key
- OpenAI and/or Anthropic API key (optional, for AI scoring)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd product-os

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - the onboarding wizard will guide you through setup.

### Environment Variables (Optional)

You can configure API keys via environment variables or through the UI:

```bash
# .env.local
LINEAR_API_KEY=lin_api_xxxxx
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Architecture

### Application Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ Onboard  │───▶│  Sync    │───▶│  Score   │───▶│  Review  │             │
│  │ (First   │    │  from    │    │  with    │    │  & Push  │             │
│  │  Time)   │    │  Linear  │    │  AI      │    │          │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│       │                │               │               │                   │
│       ▼                ▼               ▼               ▼                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ API Keys │    │ Projects │    │ Scores   │    │ Linear   │             │
│  │ Config   │    │ & Issues │    │ Storage  │    │ Priority │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Scoring Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SCORING PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Feature Request          Master Source                                     │
│        │                   (Documentation)                                   │
│        │                        │                                            │
│        │    ┌───────────────────┘                                            │
│        │    │  • Core Features (22)                                          │
│        │    │  • Extensions (26)                                             │
│        │    │  • AI Features (11)                                            │
│        │    │  • Platform Limits                                             │
│        │    │  • Known Limitations                                           │
│        │    │  • Compliance Certs                                            │
│        ▼    ▼                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    AI Analysis (Context-Aware)                       │   │
│   │  ┌───────────┐                           ┌───────────┐              │   │
│   │  │  GPT-4    │─────┐           ┌─────────│  Claude   │              │   │
│   │  │  Scoring  │     │           │         │  Scoring  │              │   │
│   │  └───────────┘     ▼           ▼         └───────────┘              │   │
│   │                ┌───────────────────┐                                │   │
│   │                │  Merge Scores     │                                │   │
│   │                │  (Configurable)   │                                │   │
│   │                └─────────┬─────────┘                                │   │
│   └──────────────────────────┼──────────────────────────────────────────┘   │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Framework Application                             │   │
│   │                                                                      │   │
│   │   Weighted    RICE      ICE     Value-Effort   MoSCoW               │   │
│   │   Σ(W×S)     R×I×C/E   I×C×E    V/E→Quadrant   Must/Should/Could    │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│                      Final Priority Score                                    │
│                         (0-10 scale)                                         │
│                              │                                               │
│                              ▼                                               │
│                    Linear Priority Mapping                                   │
│                    (Urgent/High/Normal/Low)                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Onboarding Wizard Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       ONBOARDING WIZARD (6 Steps)                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Step 1          Step 2          Step 3          Step 4                   │
│  ┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐               │
│  │Welcome │─────▶│API Keys│─────▶│ Sync   │─────▶│Frame-  │               │
│  │        │      │        │      │        │      │ work   │               │
│  └────────┘      └────────┘      └────────┘      └────────┘               │
│                       │                               │                    │
│                       │ Linear                        │                    │
│                       │ Required                      ▼                    │
│                       ▼                          Step 5                    │
│                  ┌────────┐                     ┌────────┐                 │
│                  │OpenAI/ │                     │Weights │                 │
│                  │Anthropic                     │Config  │                 │
│                  │Optional│                     └────────┘                 │
│                  └────────┘                          │                     │
│                                                      ▼                     │
│                                                 Step 6                     │
│                                                ┌────────┐                  │
│                                                │Success │──▶ Dashboard     │
│                                                └────────┘                  │
│                                                                             │
│   [Skip Setup] available at any step                                       │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

## Master Source Integration

The AI scoring system integrates with CometChat's documentation to provide context-aware feature prioritization. When scoring features, the AI receives comprehensive knowledge about:

### What the AI Knows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MASTER SOURCE CONTEXT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │  Core Features  │  │   Extensions    │  │   AI Features   │            │
│   │     (22)        │  │     (26)        │  │     (11)        │            │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤            │
│   │ • Messaging     │  │ • Engagement    │  │ • Agent Builder │            │
│   │ • Group Chat    │  │ • Moderation    │  │ • Smart Replies │            │
│   │ • Media Share   │  │ • Collaboration │  │ • Summaries     │            │
│   │ • Presence      │  │ • Notifications │  │ • BYOA Support  │            │
│   │ • Calling       │  │ • Translation   │  │ • MCP Support   │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │ Platform Limits │  │   Compliance    │  │   Limitations   │            │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤            │
│   │ • 300 group max │  │ • ISO 27001     │  │ • No offline    │            │
│   │ • 50 video call │  │ • SOC 2 Type II │  │ • No auth mgmt  │            │
│   │ • 100MB upload  │  │ • GDPR/HIPAA    │  │ • No CRM native │            │
│   │ • 65KB message  │  │ • E2E Encrypt   │  │ • SSO enterprise│            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How It Helps Scoring

| Context Type | Scoring Impact |
|-------------|----------------|
| **Core Features** | AI understands what CometChat already provides - avoids scoring existing capabilities high |
| **Extensions** | Knows what's available as add-ons vs needs new development |
| **Platform Limits** | Can assess technical feasibility and effort realistically |
| **Known Limitations** | Prioritizes features that address documented gaps |
| **Compliance** | Enterprise-readiness scoring is context-aware |
| **Competitor Data** | Competitive parity scoring uses actual market intelligence |

### Configuration

The master source data is loaded from:
- **Documentation**: `/Users/admin/cometchat/docs/`
- **Refresh**: Data is cached for 5 minutes, refresh via `POST /api/master-source`
- **API**: `GET /api/master-source` returns current data summary

## Project Structure

```
product-os/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── ai/                   # AI scoring endpoints
│   │   │   │   ├── score/            # Single feature scoring
│   │   │   │   └── score-all/        # Batch scoring
│   │   │   ├── api-keys/             # API key management
│   │   │   ├── features/             # Feature CRUD
│   │   │   ├── linear/               # Linear push
│   │   │   ├── master-source/        # Master source data API
│   │   │   ├── projects/             # Project management
│   │   │   ├── scores/               # Score overrides
│   │   │   ├── settings/             # App settings
│   │   │   └── sync/                 # Linear sync
│   │   ├── features/[id]/            # Feature detail page
│   │   ├── products/[product]/       # Product view page
│   │   ├── settings/                 # Settings page
│   │   └── page.tsx                  # Dashboard (main page)
│   │
│   ├── components/                   # React Components
│   │   ├── ui/                       # Shadcn UI components
│   │   ├── onboarding/               # Onboarding wizard
│   │   │   ├── OnboardingWizard.tsx  # Main wizard container
│   │   │   ├── WizardProgress.tsx    # Step indicator
│   │   │   └── steps/                # Individual steps
│   │   │       ├── WelcomeStep.tsx
│   │   │       ├── ApiKeysStep.tsx
│   │   │       ├── SyncStep.tsx
│   │   │       ├── FrameworkStep.tsx
│   │   │       ├── WeightsStep.tsx
│   │   │       └── SuccessStep.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Header.tsx
│   │   ├── ScoreEditor.tsx
│   │   └── ...
│   │
│   ├── lib/                          # Business Logic
│   │   ├── scoring/                  # Scoring engine
│   │   │   ├── engine.ts             # Main scoring orchestration
│   │   │   └── frameworks/           # Framework implementations
│   │   │       ├── weighted.ts
│   │   │       ├── rice.ts
│   │   │       ├── ice.ts
│   │   │       ├── moscow.ts
│   │   │       └── value-effort.ts
│   │   ├── ai/                       # AI integration
│   │   │   ├── analyzer.ts           # Feature analysis orchestration
│   │   │   ├── model-compare.ts      # GPT-4/Claude comparison
│   │   │   ├── prompt-builder.ts     # Dynamic prompt generation
│   │   │   ├── openai-client.ts
│   │   │   └── anthropic-client.ts
│   │   ├── master-data-loader.ts     # Master source data loader
│   │   ├── linear-client.ts          # Linear API client
│   │   ├── types.ts                  # TypeScript definitions
│   │   └── ...
│   │
│   ├── config/                       # Configuration
│   │   └── products.ts               # Product definitions
│   │
│   └── hooks/                        # React Hooks
│       ├── useFeatureFilters.ts
│       └── ...
│
├── data/                             # Local data storage
│   ├── api-keys.json                 # Encrypted API keys
│   ├── settings.json                 # App settings
│   ├── ai-scores.json                # Cached AI scores
│   └── ...
│
├── docs/                             # Documentation
│   └── plans/                        # Implementation plans
│       └── onboarding-wizard.md
│
└── public/                           # Static assets
```

## Scoring Frameworks

### Weighted Scoring (Default)
Multi-factor analysis with customizable weights:
- **Mature Products** (Chat, Calling): Revenue Impact, Enterprise Readiness, Request Volume, Competitive Parity, Strategic Alignment, Effort
- **New Products** (AI Agents, BYOA): Capability Gap, Strategic Alignment, Request Volume, Competitive Differentiation, Effort

### RICE
`Score = (Reach × Impact × Confidence) / Effort`
- Reach: Users affected (1-10)
- Impact: Effect magnitude (0.25-3)
- Confidence: Estimate certainty (0-100%)
- Effort: Person-months (1-10)

### ICE
`Score = Impact × Confidence × Ease`
- Impact: Business metric effect (1-10)
- Confidence: Success certainty (1-10)
- Ease: Implementation simplicity (1-10)

### Value vs Effort
Quadrant-based prioritization:
- Quick Wins (High value, Low effort)
- Big Bets (High value, High effort)
- Fill-ins (Low value, Low effort)
- Time Sinks (Low value, High effort)

### MoSCoW
Categorical prioritization:
- Must Have (Score: 10)
- Should Have (Score: 7)
- Could Have (Score: 4)
- Won't Have (Score: 1)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/api-keys` | GET | Get API key status |
| `/api/api-keys` | POST | Save/clear API keys |
| `/api/sync` | POST | Sync from Linear |
| `/api/features` | GET | Get all features with scores |
| `/api/features/[id]` | GET | Get single feature |
| `/api/ai/score` | POST | Score single feature |
| `/api/ai/score-all` | POST | Start batch scoring job |
| `/api/ai/score-all?jobId=x` | GET | Poll job status |
| `/api/master-source` | GET | Get master source data summary |
| `/api/master-source` | POST | Refresh master source cache |
| `/api/settings` | GET | Get settings |
| `/api/settings` | POST | Update settings |
| `/api/linear` | POST | Push priorities to Linear |

## Configuration

### Products
Defined in `src/config/products.ts`:
- Chat & Messaging (mature)
- Voice & Video Calling (mature)
- AI Agents Platform (new)
- Bring Your Own Agent (new)

### Weights
Configurable via Settings UI or API:
```typescript
{
  mature: {
    revenueImpact: 0.30,
    enterpriseReadiness: 0.20,
    requestVolume: 0.15,
    competitiveParity: 0.15,
    strategicAlignment: 0.10,
    effort: 0.10
  },
  new: {
    capabilityGap: 0.30,
    strategicAlignment: 0.25,
    requestVolume: 0.15,
    competitiveDifferentiation: 0.15,
    effort: 0.15
  }
}
```

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## Testing Onboarding

To reset onboarding and test the wizard flow:

```javascript
// In browser console
localStorage.removeItem('product-os-onboarding-complete');
localStorage.removeItem('product-os-onboarding-progress');
location.reload();
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (Radix UI)
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Integration**: Linear API
- **Storage**: Local JSON files

## License

MIT
