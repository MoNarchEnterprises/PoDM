# Admin AI Model Selection for Bulk Captioning

## Goal

Let the admin change the AI model used for bulk captioning through the admin settings panel, without needing a server restart or env file edit.

---

## Current State

- **Model is env-only:** `ai.service.ts:30` reads `process.env.AI_MODEL_ID` with a hardcoded fallback `"google/gemma-3-27b-it:free"`
- **Server restart required** to change the model — impractical for an admin who wants to swap models on the fly
- **Existing infrastructure:** `platform_settings` table (key-value), `SettingsModel.getSetting/updateSetting`, `admin.service.ts` `getPlatformSettings/updatePlatformSettings`, **SettingsPanel.tsx** with commission rate input — all ready to extend

---

## Design

### Data flow

```
Admin opens SettingsPanel
  → GET /admin/settings/platform returns { commissionRate, aiModelId }
  → "AI Model" input shows current model

Admin types model ID and clicks Save
  → PUT /admin/settings/platform { aiModelId: "openai/gpt-4o" }
  → Stored as key 'ai_model_id' in platform_settings table

Creator uses AI Caption on bulk-upload
  → ai.service.ts generateCaption()
  → Reads ai_model_id from platform_settings table
  → If no DB value → falls back to env var AI_MODEL_ID (current behavior)
  → If no env var → falls back to "google/gemma-3-27b-it:free"
```

### Backend changes

#### 1. `admin.service.ts` — return `aiModelId` in settings

**File:** `PoDM_project/server/services/admin.service.ts`

Update `getPlatformSettings`:
```typescript
export const getPlatformSettings = async () => {
    const [commissionRateSetting, aiModelIdSetting] = await Promise.all([
        SettingsModel.getSetting('platform_commission_rate'),
        SettingsModel.getSetting('ai_model_id'),
    ]);
    return {
        commissionRate: commissionRateSetting?.value || DEFAULT_COMMISSION_RATE,
        aiModelId: aiModelIdSetting?.value || process.env.AI_MODEL_ID || 'google/gemma-3-27b-it:free',
    };
};
```

Update `updatePlatformSettings` to accept `aiModelId`:
```typescript
export const updatePlatformSettings = async (settings: {
    commissionRate?: number;
    aiModelId?: string;
}) => {
    const updates: Promise<any>[] = [];

    if (settings.commissionRate !== undefined) {
        if (typeof settings.commissionRate !== 'number') {
            throw new AppError('Commission rate must be a number.', 400);
        }
        updates.push(SettingsModel.updateSetting('platform_commission_rate', settings.commissionRate));
    }

    if (settings.aiModelId !== undefined) {
        if (typeof settings.aiModelId !== 'string' || !settings.aiModelId.trim()) {
            throw new AppError('AI model ID must be a non-empty string.', 400);
        }
        updates.push(SettingsModel.updateSetting('ai_model_id', settings.aiModelId.trim()));
    }

    if (updates.length === 0) {
        throw new AppError('No valid settings provided.', 400);
    }

    await Promise.all(updates);
    return { success: true, message: 'Platform settings updated.' };
};
```

The `commissionRate` field is now optional — the existing frontend always sends it, but this makes the endpoint flexible.

#### 2. `ai.service.ts` — read model from DB before env

**File:** `PoDM_project/server/services/ai.service.ts`

Add import:
```typescript
import * as SettingsModel from '../models/settings.model';
```

Replace line 30:
```typescript
// Before:
const model = process.env.AI_MODEL_ID || "google/gemma-3-27b-it:free";

// After:
const dbSetting = await SettingsModel.getSetting('ai_model_id');
const model = dbSetting?.value || process.env.AI_MODEL_ID || "google/gemma-3-27b-it:free";
```

Make `generateCaption` async-safe (it already is). The DB call adds ~5-10ms latency to the caption request — negligible compared to the AI API call (~2-10s).

**Priority chain:**
1. `platform_settings` table key `ai_model_id` (admin UI, takes effect immediately)
2. `AI_MODEL_ID` env var (server restart required)
3. `"google/gemma-3-27b-it:free"` (hardcoded fallback)

#### 3. `apiClient.ts` — update type to include aiModelId

**File:** `podm-frontend/src/lib/apiClient.ts`

Update `getPlatformSettings` return type (line 268):
The existing `api('get', '...')` already passes through any response fields. No change needed unless strict typing is used.

Update `updatePlatformSettings` parameter (line 275):
```typescript
export const updatePlatformSettings = (settings: {
    commissionRate?: number;
    aiModelId?: string;
}) =>
    api('put', '/admin/settings/platform', settings);
```

Make both fields optional so either can be sent independently.

#### 4. `SettingsPanel.tsx` — add AI Model input

**File:** `podm-frontend/src/features/admin/components/SettingsPanel.tsx`

Add state (after `commissionRate`):
```typescript
const [aiModelId, setAiModelId] = useState('');
```

Read on fetch (in the `useEffect`):
```typescript
const response = await apiClient.getPlatformSettings();
setCommissionRate(response.data.commissionRate.toString());
setAiModelId(response.data.aiModelId || '');
```

Add input card (after the Financial Settings card, before Admin Accounts):
```tsx
<Card noPadding>
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">AI Caption Model</h3>
    </div>
    <div className="p-6 space-y-4">
        <Input
            id="ai-model-id"
            label="Model ID"
            type="text"
            value={aiModelId}
            onChange={(e) => setAiModelId(e.target.value)}
            containerClassName="md:w-1/2"
            placeholder="e.g. openai/gpt-4o, google/gemma-3-27b-it:free"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
            Uses OpenRouter model IDs by default. Changes apply immediately — no server restart needed.
        </p>
        <div className="flex justify-end items-center gap-4">
            <Button
                leftIcon={Save}
                onClick={async () => {
                    setIsLoading(true);
                    setError(null);
                    setSuccess(null);
                    try {
                        await apiClient.updatePlatformSettings({ aiModelId });
                        setSuccess('AI model updated!');
                        setTimeout(() => setSuccess(null), 3000);
                    } catch (err: any) {
                        setError(err.message || 'Failed to update AI model.');
                    } finally {
                        setIsLoading(false);
                    }
                }}
                isLoading={isSaving}
            >
                Save AI Model
            </Button>
            {success && <p className="text-sm text-green-600">{success}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    </div>
</Card>
```

Separate the `isSaving/error/success` state for the AI model section from the financial settings section (or use independent states). The simplest approach: add a second set of states (`aiSaving`, `aiError`, `aiSuccess`) scoped to the AI card.

---

## Files Changed

| File | Change |
|---|---|
| `PoDM_project/server/services/admin.service.ts` | `getPlatformSettings` reads `ai_model_id` from DB; `updatePlatformSettings` accepts optional `aiModelId` |
| `PoDM_project/server/services/ai.service.ts` | `generateCaption` reads model from `platform_settings` table first, falls back to env var, then hardcoded default |
| `podm-frontend/src/lib/apiClient.ts` | `updatePlatformSettings` accepts `{ commissionRate?, aiModelId? }` |
| `podm-frontend/src/features/admin/components/SettingsPanel.tsx` | Add "AI Caption Model" card with model ID input and save button |

No new files, no new tables, no new routes. Reuses the existing `platform_settings` key-value store and admin settings endpoint.

---

## UX

Admin sees in Settings Panel:

```
┌─────────────────────────────────────────────┐
│  Financial Settings                          │
│  Commission Rate: [ 12.5        ] [Save]    │
├─────────────────────────────────────────────┤
│  AI Caption Model                            │
│  Model ID: [ google/gemma-3-27b-it:free ]    │
│  Uses OpenRouter model IDs by default.       │
│  Changes apply immediately.           [Save] │
├─────────────────────────────────────────────┤
│  Admin Accounts                              │
│  ...                                         │
└─────────────────────────────────────────────┘
```

---

## OpenRouter Compatibility

The SDK auto-detects OpenRouter when `AI_API_KEY` starts with `sk-or-v1` (line 9 of `ai.service.ts`). Model IDs are OpenRouter-compatible strings like `openai/gpt-4o`, `google/gemma-3-27b-it:free`, `anthropic/claude-3-opus`, `meta-llama/llama-3-70b-instruct`. If the admin switches to a direct OpenAI key, model IDs like `gpt-4o` or `gpt-4o-mini` work instead.

---

## Order of Implementation

1. **Backend:** Update `admin.service.ts` — add `ai_model_id` read/write
2. **Backend:** Update `ai.service.ts` — read model from DB first
3. **Frontend:** Update `apiClient.ts` types
4. **Frontend:** Add AI Model input to `SettingsPanel.tsx`

Steps 1+2 independent of 3+4; they all converge at step 4.
