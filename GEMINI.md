# Gemini API Integration

This project relies heavily on the Google Gemini API for all core functionality. This document outlines the models used, the prompting strategy, and the architecture of the AI service layer.

## Models Used

### 1. Narrative & Logic Engine
*   **Model**: `gemini-3-pro-preview`
*   **Purpose**: Handles story generation, rule adjudication, state management (inventory/quests), and logic.
*   **Configuration**:
    *   `responseMimeType`: `application/json`
    *   **Reasoning**: We use JSON mode to ensure the AI returns structured data (Inventory arrays, separate visual descriptions) rather than just unstructured text. This allows the frontend to parse game state programmatically.

### 2. Image Generation
*   **Primary Model**: `gemini-3-pro-image-preview`
*   **Purpose**: Generates high-fidelity, cinematic visualizations of the current scene.
*   **Configuration**: 
    *   `imageSize`: Selectable (1K, 2K, 4K)
    *   `aspectRatio`: 16:9
*   **Fallback Model**: `gemini-2.5-flash-image`
*   **Fallback Logic**: If the user's API key does not have permission for the Pro Preview model (403 Forbidden), the service automatically falls back to the Flash Image model to ensure the game remains playable.

## Architecture (`services/geminiService.ts`)

The integration is encapsulated entirely within the `geminiService.ts` file.

### Structured Output (JSON Schema)
We define a strict schema using the `@google/genai` types to force the model to act as a game engine.

```typescript
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING }, // The story text
    visualDescription: { type: Type.STRING }, // Prompt for the image generator
    inventory: { type: Type.ARRAY, items: { type: Type.STRING } }, // Current items
    currentQuest: { type: Type.STRING }, // Active objective
    locationName: { type: Type.STRING }, // For map tracking
    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } } // UI hints
  },
  required: ["narrative", "visualDescription", "inventory", "currentQuest", "locationName", "suggestedActions"],
};
```

### Prompt Engineering
The system instruction is the "brain" of the Dungeon Master. Key components of the prompt:
1.  **Role**: "Advanced Dungeon Master".
2.  **State Tracking**: Explicit instructions to add/remove items from the `inventory` array based on context.
3.  **Visual Consistency**: Instructions to ensure the `visualDescription` matches the user's defined character appearance (e.g., "A mage with red robes").
4.  **Language Control**: Logic to switch output language (English/Russian) dynamically based on the user's setting.

### Robustness & Reliability

#### Rate Limit Handling (429)
The API layer includes a custom wrapper function `runWithRetry`.
*   It detects `429 RESOURCE_EXHAUSTED` errors.
*   It parses the error message to find the specific "retry in X seconds" time provided by the API.
*   It waits for that duration (plus a buffer) and retries up to 5 times.

#### Permission Handling (403)
Image generation is wrapped in a try/catch block that specifically looks for `403` errors. This is crucial for users who may have valid API keys but haven't enabled specific billing features for the experimental Pro models.

## Client Initialization
The `GoogleGenAI` client is initialized *inside* the function calls (`generateStorySegment`, `generateSceneImage`) rather than globally. 
*   **Why?** This ensures that if the user changes their API key or selects a new project via the `window.aistudio` overlay, the next request immediately uses the valid key without needing a page reload.
