# Chronicle: Infinite Adventure

Chronicle is an AI-powered, text-based Role Playing Game (RPG) engine that generates an infinite, evolving story based on user choices. Unlike traditional interactive fiction with pre-written paths, Chronicle uses Google's Gemini models to generate narrative, manage game state, and visualize scenes in real-time.

## Features

- **Infinite Narrative**: No pre-set scripts. The story evolves organically based on your actions.
- **Dynamic State Management**:
  - **Inventory**: The AI automatically adds or removes items from your inventory based on story context.
  - **Quests**: Objectives update dynamically as the plot thickens.
  - **Location History**: The game tracks where you've been to build a coherent world map.
- **Visual Immersion**:
  - **Real-time Scene Generation**: Every turn generates a high-quality illustration of the current moment.
  - **Dynamic Map**: A visual node-map tracks your journey through the world.
- **Character Creation**: Define your name, class, and appearance, which influences the story and generated art.
- **Persistence**: Autosave functionality ensures you never lose your progress.
- **Localization**: Full support for English and Russian languages.

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Markdown**: `react-markdown` for rendering formatted story text.

## Core Mechanics

### The Game Loop
1. **User Action**: The player types an action (e.g., "Attack the goblin" or "Search the chest").
2. **Context Assembly**: The app bundles the action, previous history, current inventory, active quest, and character details.
3. **AI Generation**: 
   - A text model (`gemini-3-pro-preview`) generates the next narrative segment, updates inventory/quest state, and writes a visual description for the scene.
   - An image model (`gemini-3-pro-image-preview`) uses the visual description to create an illustration.
4. **State Update**: The UI updates to show the new story card, updated stats, and new image.

### Rate Limits & Error Handling
The application implements robust error handling for API quotas:
- **Retry Logic**: Exponential backoff strategy for handling 429 (Too Many Requests) errors.
- **Fallback Models**: If high-end image models are unavailable (403 Permission Denied), the system gracefully degrades to faster, standard models.

## Usage

1. **API Key**: You must select a valid Google Cloud Project API Key with billing enabled (for Veo/Pro Vision features) when prompted.
2. **Start**: Click "Create Character" to define your hero.
3. **Play**: Type your actions into the input bar. There are no wrong choices.
