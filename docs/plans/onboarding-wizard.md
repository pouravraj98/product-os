# First-Time Onboarding Wizard Plan

## Goal
Create a **Setup Wizard Modal** that guides first-time users through full app configuration: API keys → first sync → scoring framework → weight configuration.

---

## Detection Strategy
- **localStorage flag:** `product-os-onboarding-complete`
- Check on app load in `page.tsx`
- Optional: `product-os-onboarding-progress` for partial progress persistence

---

## Wizard Steps

| Step | Title | Purpose |
|------|-------|---------|
| 1 | Welcome | App overview, what the wizard will configure |
| 2 | API Keys | Linear (required), OpenAI/Anthropic (optional) |
| 3 | First Sync | Trigger Linear sync with progress indicator |
| 4 | Framework | Select scoring framework (weighted, RICE, ICE, etc.) |
| 5 | Weights | Configure weights or use defaults |
| 6 | Success | Confirmation + "Go to Dashboard" |

**Skip option:** Available on all steps, marks onboarding complete

---

## File Structure

```
src/components/onboarding/
  OnboardingWizard.tsx       # Main wizard container + state
  WizardProgress.tsx         # Step indicator bar
  steps/
    WelcomeStep.tsx          # Step 1
    ApiKeysStep.tsx          # Step 2
    SyncStep.tsx             # Step 3
    FrameworkStep.tsx        # Step 4
    WeightsStep.tsx          # Step 5
    SuccessStep.tsx          # Step 6
```

---

## Implementation Status: COMPLETED

### Phase 1: Core Wizard Structure ✅
**Files created:**
- `/src/components/onboarding/OnboardingWizard.tsx`
- `/src/components/onboarding/WizardProgress.tsx`
- `/src/components/onboarding/steps/WelcomeStep.tsx`
- `/src/components/onboarding/steps/SuccessStep.tsx`

**Changes to existing:**
- `/src/app/page.tsx` - Added onboarding state and integration

### Phase 2: API Keys Step ✅
**File created:**
- `/src/components/onboarding/steps/ApiKeysStep.tsx`

**Features:**
- Three key input fields with show/hide toggle
- Save keys via `POST /api/api-keys`
- Validate Linear key is configured before allowing next
- Show configuration status badges

### Phase 3: Sync Step ✅
**File created:**
- `/src/components/onboarding/steps/SyncStep.tsx`

**Features:**
- "Start Sync" button to trigger `POST /api/sync`
- Progress indicator showing sync status
- Display counts (projects found, issues synced)
- Error handling with retry option
- Allow skipping if sync takes too long

### Phase 4: Framework & Weights Steps ✅
**Files created:**
- `/src/components/onboarding/steps/FrameworkStep.tsx`
- `/src/components/onboarding/steps/WeightsStep.tsx`

**Features:**
- Framework selection with card grid UI
- Use `getAllFrameworks()` from scoring engine
- Weights step with "Use Defaults" toggle
- Weight sliders for customization
- Save via `POST /api/settings`

### Phase 5: Header Cleanup ✅
**Changes to `/src/components/Header.tsx`:**
- Removed AI Model Badge (showed "GPT-4", "Claude", or "Both")
- Removed Usage Badge (showed "$X.XX today")
- Cleaned up unused imports and functions

---

## Key Files Modified

| File | Changes |
|------|---------|
| `/src/app/page.tsx` | Added `showOnboarding` state, localStorage check, render wizard |
| `/src/components/onboarding/OnboardingWizard.tsx` | New - main wizard component |
| `/src/components/onboarding/WizardProgress.tsx` | New - step progress indicator |
| `/src/components/onboarding/steps/*.tsx` | New - individual step components |
| `/src/components/Header.tsx` | Removed AI model badge and usage/pricing badge |

---

## API Integration

| Step | API Endpoint | Method | Purpose |
|------|--------------|--------|---------|
| API Keys | `/api/api-keys` | POST | Save API keys |
| API Keys | `/api/api-keys` | GET | Check key status |
| Sync | `/api/sync` | POST | Trigger Linear sync |
| Framework | `/api/settings` | POST | Save framework selection |
| Weights | `/api/settings` | POST | Save weight configuration |

---

## State Structure

```typescript
interface OnboardingState {
  currentStep: number;  // 1-6
  isOpen: boolean;

  // API Keys
  apiKeys: { linear: string; openai: string; anthropic: string };
  apiKeyStatus: Record<string, { configured: boolean; source: string }>;

  // Sync
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
  syncError: string | null;

  // Configuration
  selectedFramework: ScoringFramework;
  useCustomWeights: boolean;
}
```

---

## UI Patterns Used

1. **Dialog** - From `/src/components/ui/dialog.tsx`
2. **API Key inputs** - Pattern from `/src/app/settings/page.tsx`
3. **Framework cards** - Custom card selection UI
4. **Weight sliders** - From settings weights tab pattern
5. **Progress/loading** - Consistent with app patterns

---

## Verification Checklist

1. **First-time detection:**
   - [x] New browser shows wizard on first visit
   - [x] Returning users don't see wizard
   - [x] Clearing localStorage shows wizard again

2. **API Keys step:**
   - [x] Can save Linear API key
   - [x] Can save OpenAI/Anthropic keys (optional)
   - [x] Cannot proceed without Linear key
   - [x] Shows validation status

3. **Sync step:**
   - [x] Triggers sync successfully
   - [x] Shows progress indicator
   - [x] Handles errors with retry option
   - [x] Can skip if needed

4. **Framework step:**
   - [x] Shows all available frameworks
   - [x] Selection persists to settings

5. **Weights step:**
   - [x] Can use defaults
   - [x] Can customize weights
   - [x] Saves to settings

6. **Complete flow:**
   - [x] Skip works at any step
   - [x] Dashboard loads after completion
   - [x] Data appears after sync

---

## Helper Functions

The `OnboardingWizard.tsx` exports helper functions for testing:

```typescript
// Check if onboarding is complete
isOnboardingComplete(): boolean

// Reset onboarding (for testing)
resetOnboarding(): void
```

To reset onboarding for testing, run in browser console:
```javascript
localStorage.removeItem('product-os-onboarding-complete');
localStorage.removeItem('product-os-onboarding-progress');
location.reload();
```
