# NVIDIA AI Model Support for Captioning

## Goal

Add NVIDIA as a selectable AI provider alongside OpenRouter for bulk captioning, so the admin can switch providers and use NVIDIA's free-tier vision models without a server restart.

---

## Current State

- `ai.service.ts` creates a single OpenAI SDK client at module load, pointed at either OpenRouter or OpenAI's API depending on whether `AI_API_KEY` starts with `sk-or-v1`
- No provider concept — only one implicit path
- The `bulk-upload-fix.md` plan adds `ai_model_id` to the `platform_settings` table for model selection, but the provider is still hardcoded to whatever the env key dictates

---

## How NVIDIA's API Works

NVIDIA AI Foundation models are available through an **OpenAI-compatible endpoint** at:

```
https://integrate.api.nvidia.com/v1
```

This means no new SDK is needed — the existing OpenAI client can point at NVIDIA's base URL with an NVIDIA API key. The same `chat.completions.create()` call works with NVIDIA model IDs.

**Vision models available on NVIDIA's free tier:**

| Model | Params | Notes |
|---|---|---|
| `meta/llama-3.2-11b-vision-instruct` | 11B | Latest LLaMA vision, good captions |
| `meta/llama-3.2-90b-vision-instruct` | 90B | Too large for captioning latency |
| `microsoft/phi-3-vision-128k-instruct` | 4.2B | Small, fast, decent for captions |
| `nvidia/neva-22b` | 22B | NVIDIA's own VLM |

Free tier: typically 1,000–5,000 API calls/month with rate limits.

---

## Design

### Provider Model

Three providers, each with its own base URL and API key:

| Provider | Base URL | API Key Stored As | Default Model |
|---|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` | `ai_api_key` (DB) or `AI_API_KEY` env | `google/gemma-3-27b-it:free` |
| NVIDIA | `https://integrate.api.nvidia.com/v1` | `nvidia_api_key` (DB) or `NVIDIA_API_KEY` env | `meta/llama-3.2-11b-vision-instruct` |
| OpenAI Direct | `https://api.openai.com/v1` (SDK default) | `openai_api_key` (DB) or `OPENAI_API_KEY` env | `gpt-4o-mini` |

### Resolution Order (per setting)

For each setting, the DB value takes precedence over the env var:

```
DB value (admin UI, immediate) → env var (restart) → hardcoded default
```

This applies to:
- `ai_provider` — which provider to use
- `ai_model_id` — which model to use (already planned in bulk-upload-fix.md)
- `ai_api_key` — OpenRouter key
- `nvidia_api_key` — NVIDIA key
- `openai_api_key` — OpenAI direct key

---

## Data Flow

```
Admin opens SettingsPanel
  → GET /admin/settings/platform returns:
     { commissionRate, aiProvider, aiModelId, aiApiKey, nvidiaApiKey, openaiApiKey }

Admin selects "NVIDIA", enters model ID, clicks Save
  → PUT /admin/settings/platform
     { aiProvider: "nvidia", aiModelId: "meta/llama-3.2-11b-vision-instruct", nvidiaApiKey: "nvapi-..." }

Creator uses AI Caption on bulk-upload
  → ai.service.ts generateCaption()
  → Reads ai_provider, ai_model_id, and the provider's API key from DB
  → Creates an OpenAI client dynamically with the right base URL + key
  → Calls chat.completions.create() with the selected model
```

---

## Backend Changes

### 1. `admin.service.ts` — return all AI settings

**File:** `PoDM_project/server/services/admin.service.ts`

Update `getPlatformSettings`:
```typescript
export const getPlatformSettings = async () => {
    const [
        commissionRateSetting, aiProviderSetting, aiModelIdSetting,
        aiApiKeySetting, nvidiaApiKeySetting, openaiApiKeySetting
    ] = await Promise.all([
        SettingsModel.getSetting('platform_commission_rate'),
        SettingsModel.getSetting('ai_provider'),
        SettingsModel.getSetting('ai_model_id'),
        SettingsModel.getSetting('ai_api_key'),
        SettingsModel.getSetting('nvidia_api_key'),
        SettingsModel.getSetting('openai_api_key'),
    ]);
    return {
        commissionRate: commissionRateSetting?.value || DEFAULT_COMMISSION_RATE,
        aiProvider: aiProviderSetting?.value || 'openrouter',
        aiModelId: aiModelIdSetting?.value || process.env.AI_MODEL_ID || 'google/gemma-3-27b-it:free',
        // Return masked keys — last 4 chars only, for display
        aiApiKey: aiApiKeySetting?.value ? `...${aiApiKeySetting.value.slice(-4)}` : '',
        nvidiaApiKey: nvidiaApiKeySetting?.value ? `...${nvidiaApiKeySetting.value.slice(-4)}` : '',
        openaiApiKey: openaiApiKeySetting?.value ? `...${openaiApiKeySetting.value.slice(-4)}` : '',
    };
};
```

**Security note:** API keys are returned **masked** (only last 4 chars) so the frontend can show whether a key is configured without exposing it. The admin enters a new key when they want to change it; leaving the field blank keeps the existing key.

Update `updatePlatformSettings`:
```typescript
export const updatePlatformSettings = async (settings: {
    commissionRate?: number;
    aiProvider?: string;
    aiModelId?: string;
    aiApiKey?: string;
    nvidiaApiKey?: string;
    openaiApiKey?: string;
}) => {
    const updates: Promise<any>[] = [];

    if (settings.commissionRate !== undefined) {
        if (typeof settings.commissionRate !== 'number') {
            throw new AppError('Commission rate must be a number.', 400);
        }
        updates.push(SettingsModel.updateSetting('platform_commission_rate', settings.commissionRate));
    }

    if (settings.aiProvider !== undefined) {
        updates.push(SettingsModel.updateSetting('ai_provider', settings.aiProvider));
    }

    if (settings.aiModelId !== undefined) {
        updates.push(SettingsModel.updateSetting('ai_model_id', settings.aiModelId));
    }

    // Only update API keys if a non-empty value is provided
    if (settings.aiApiKey) {
        updates.push(SettingsModel.updateSetting('ai_api_key', settings.aiApiKey));
    }
    if (settings.nvidiaApiKey) {
        updates.push(SettingsModel.updateSetting('nvidia_api_key', settings.nvidiaApiKey));
    }
    if (settings.openaiApiKey) {
        updates.push(SettingsModel.updateSetting('openai_api_key', settings.openaiApiKey));
    }

    if (updates.length === 0) {
        throw new AppError('No valid settings provided.', 400);
    }

    await Promise.all(updates);
    return { success: true, message: 'Platform settings updated.' };
};
```

### 2. `ai.service.ts` — dynamic client per provider

**File:** `PoDM_project/server/services/ai.service.ts`

Major restructure — replace the module-level singleton client with a per-request dynamic client:

```typescript
import OpenAI from 'openai';
import { AppError } from '../middleware/error.middleware';
import * as SettingsModel from '../models/settings.model';

type AIProvider = 'openrouter' | 'nvidia' | 'openai';

interface ProviderConfig {
    baseURL: string;
    apiKey: string;
}

const PROVIDER_CONFIGS: Record<AIProvider, { baseURL: string; defaultModel: string; envKey: string; dbKey: string }> = {
    openrouter: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultModel: 'google/gemma-3-27b-it:free',
        envKey: 'AI_API_KEY',
        dbKey: 'ai_api_key',
    },
    nvidia: {
        baseURL: 'https://integrate.api.nvidia.com/v1',
        defaultModel: 'meta/llama-3.2-11b-vision-instruct',
        envKey: 'NVIDIA_API_KEY',
        dbKey: 'nvidia_api_key',
    },
    openai: {
        baseURL: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        envKey: 'OPENAI_API_KEY',
        dbKey: 'openai_api_key',
    },
};

async function getProviderConfig(): Promise<ProviderConfig & { model: string }> {
    const dbProvider = await SettingsModel.getSetting('ai_provider');
    const provider: AIProvider = dbProvider?.value || 'openrouter';

    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
        throw new AppError(`Unknown AI provider: ${provider}`, 500);
    }

    // Resolve API key: DB → env var → error
    const dbApiKey = await SettingsModel.getSetting(config.dbKey);
    const apiKey = dbApiKey?.value || process.env[config.envKey];
    if (!apiKey) {
        throw new AppError(`No API key configured for provider "${provider}". Set ${config.envKey} in .env or configure it in admin settings.`, 400);
    }

    // Resolve model: DB → env var → provider default
    const dbModel = await SettingsModel.getSetting('ai_model_id');
    const model = dbModel?.value || process.env.AI_MODEL_ID || config.defaultModel;

    return { baseURL: config.baseURL, apiKey, model };
}

export const generateCaption = async (imageUrl: string): Promise<string> => {
    try {
        const { baseURL, apiKey, model } = await getProviderConfig();
        console.log(`Using provider: baseURL=${baseURL}, model=${model}`);

        const client = new OpenAI({ apiKey, baseURL });

        const response = await client.chat.completions.create({
            model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Write ONE witty, enticing caption for this image or video in English only. Do not use foreign characters. Do not provide options. Do not include introductory text like 'Here is a caption'. Just output the caption itself. Use wordplay or double meanings. Include 1-2 emojis and hashtags. Max 20 words." },
                        (imageUrl.startsWith('data:video')
                            ? { type: "video_url", video_url: { url: imageUrl } }
                            : { type: "image_url", image_url: { url: imageUrl } }
                        ) as any,
                    ],
                },
            ],
            max_tokens: 100,
        });

        return response.choices[0]?.message?.content || "Just posted! ✨ #newcontent";
    } catch (error: any) {
        console.error('Error generating caption:', error);
        const status = error.status || error.statusCode || 500;
        throw new AppError(error.message || 'Failed to generate caption via AI service.', status);
    }
};
```

**Key changes from current:**
- Removes module-level `openai` singleton and `dotenv` import
- `PROVIDER_CONFIGS` map holds all three providers' base URLs, default models, and key sources
- `getProviderConfig()` reads `ai_provider` from DB to pick the provider, then resolves key + model for that provider
- A new `OpenAI` client is created per request — negligible overhead (no network calls in constructor)
- API key check moved from module init to request time

### 3. Backward compatibility

If no `ai_provider` is set in the DB, the code defaults to `'openrouter'`. The OpenRouter API key resolves from `DB key 'ai_api_key'` → `AI_API_KEY` env var → throws (preserving the existing behavior where the key is required). The model resolves from `DB 'ai_model_id'` → `AI_MODEL_ID` env var → `'google/gemma-3-27b-it:free'`.

Existing deployments with only `AI_API_KEY` and `AI_MODEL_ID` set in `.env` continue working — zero-config migration.

---

## Frontend Changes

### 4. `apiClient.ts` — update types

**File:** `podm-frontend/src/lib/apiClient.ts`

```typescript
export const updatePlatformSettings = (settings: {
    commissionRate?: number;
    aiProvider?: string;
    aiModelId?: string;
    aiApiKey?: string;
    nvidiaApiKey?: string;
    openaiApiKey?: string;
}) =>
    api('put', '/admin/settings/platform', settings);
```

`getPlatformSettings` already passes through response fields — no change needed.

### 5. `SettingsPanel.tsx` — provider dropdown + key inputs

**File:** `podm-frontend/src/features/admin/components/SettingsPanel.tsx`

Replace the simple "AI Caption Model" card with a richer "AI Captioning" section:

```tsx
<Card noPadding>
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">AI Captioning</h3>
    </div>
    <div className="p-6 space-y-4">
        {/* Provider selector */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider
            </label>
            <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full md:w-1/3 px-4 py-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"
            >
                <option value="openrouter">OpenRouter</option>
                <option value="nvidia">NVIDIA</option>
                <option value="openai">OpenAI Direct</option>
            </select>
        </div>

        {/* Model ID */}
        <Input
            id="ai-model-id"
            label="Model ID"
            type="text"
            value={aiModelId}
            onChange={(e) => setAiModelId(e.target.value)}
            containerClassName="md:w-1/2"
            placeholder={providerPlaceholder} // derived from selected provider
        />

        {/* API Key — provider-specific */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {providerKeyLabel} API Key
            </label>
            <input
                type="password"
                value={providerApiKey}
                onChange={(e) => setProviderApiKey(e.target.value)}
                placeholder={providerKeyPlaceholder}
                className="w-full md:w-1/2 px-4 py-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {providerKeyHint}
            </p>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
            Changes apply immediately — no server restart needed.
        </p>

        <div className="flex justify-end items-center gap-4">
            {aiSuccess && <p className="text-sm text-green-600">{aiSuccess}</p>}
            {aiError && <p className="text-sm text-red-600">{aiError}</p>}
            <Button leftIcon={Save} onClick={handleSaveAiSettings} isLoading={aiSaving}>
                Save AI Settings
            </Button>
        </div>
    </div>
</Card>
```

**State variables (added alongside existing financial settings states):**
```typescript
const [aiProvider, setAiProvider] = useState('openrouter');
const [aiModelId, setAiModelId] = useState('');
const [aiApiKey, setAiApiKey] = useState('');
const [nvidiaApiKey, setNvidiaApiKey] = useState('');
const [openaiApiKey, setOpenaiApiKey] = useState('');
const [aiSaving, setAiSaving] = useState(false);
const [aiError, setAiError] = useState<string | null>(null);
const [aiSuccess, setAiSuccess] = useState<string | null>(null);
```

**Fetch on load:**
```typescript
const response = await apiClient.getPlatformSettings();
const s = response.data;
setCommissionRate(s.commissionRate?.toString() || '');
setAiProvider(s.aiProvider || 'openrouter');
setAiModelId(s.aiModelId || '');
// Masked keys shown as-is (e.g. "...9f94")
setAiApiKey(s.aiApiKey || '');
setNvidiaApiKey(s.nvidiaApiKey || '');
setOpenaiApiKey(s.openaiApiKey || '');
```

**Provider-dependent key field logic:**
```typescript
const currentProviderKey = aiProvider === 'openrouter' ? aiApiKey
    : aiProvider === 'nvidia' ? nvidiaApiKey
    : openaiApiKey;

const setCurrentProviderKey = (val: string) => {
    if (aiProvider === 'openrouter') setAiApiKey(val);
    else if (aiProvider === 'nvidia') setNvidiaApiKey(val);
    else setOpenaiApiKey(val);
};
```

The UI shows only the relevant API key field based on the selected provider, keeping the form clean. All three keys are stored independently so switching providers doesn't lose the previously configured key.

---

## Generated Prompt Per Model

The prompt text stays the same for all providers — the `chat.completions.create()` API is OpenAI-compatible across all three.

However, some models respond differently. NVIDIA's free-tier models (especially smaller ones like `phi-3-vision`) may produce shorter or less creative captions. The admin can test different models through the bulk-upload UI and pick the one that works best.

---

## Files Changed

| File | Change |
|---|---|
| `PoDM_project/server/services/admin.service.ts` | `getPlatformSettings` returns `aiProvider`, all 3 API keys (masked), `aiModelId`; `updatePlatformSettings` accepts all AI fields |
| `PoDM_project/server/services/ai.service.ts` | Replace module-level OpenAI singleton with dynamic `getProviderConfig()`; create client per request based on provider; resolve key from DB → env for each provider |
| `podm-frontend/src/lib/apiClient.ts` | `updatePlatformSettings` accepts `aiProvider?`, `aiApiKey?`, `nvidiaApiKey?`, `openaiApiKey?` |
| `podm-frontend/src/features/admin/components/SettingsPanel.tsx` | Replace AI Model card with full AI Captioning section: provider dropdown, model ID input, provider-specific API key field (masked) |
| `.env` (documentation) | Optional: add `NVIDIA_API_KEY` and `OPENAI_API_KEY` env vars as fallbacks (no restart needed since DB takes priority) |

---

## Security

- API keys sent from admin panel to backend over HTTPS
- Stored in Supabase `platform_settings` table (same as commission rate)
- `GET /admin/settings/platform` returns keys **masked** — only last 4 chars
- Frontend shows `"...9f94"` — admin sees whether key is configured but never the full key
- Admin enters a new key to change it; blank field = keep existing
- If no key in DB, `ai.service.ts` falls back to env var — existing `.env` setup still works

---

## Order of Implementation

1. **Backend:** `admin.service.ts` — add AI provider, model, and key fields to get/update
2. **Backend:** `ai.service.ts` — restructure to dynamic per-provider client
3. **Frontend:** `apiClient.ts` — add provider + key fields to settings types
4. **Frontend:** `SettingsPanel.tsx` — provider dropdown + key-aware form

Steps 1+2 can be done in parallel with 3+4. All converge at step 4.

---

## Rollback

Since no DB schema changes are needed (all values go into the existing `platform_settings` key-value store), reverting is just a matter of:
1. Clear the `ai_provider`, `ai_model_id`, and provider-specific API key rows from `platform_settings` in the DB
2. Revert the code changes
3. The env fallback ensures existing deployments continue working at every intermediate step
