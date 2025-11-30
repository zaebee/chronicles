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

## Gameplay Mechanics

### 1. Narrative Generation
Chronicle is not a "Choose Your Own Adventure" book with page numbers; it is a collaborative storytelling engine. You are the protagonist, and the AI is the Dungeon Master.
- **Total Freedom**: You are not limited to "Option A" or "Option B". You can type *anything*. Want to negotiate with the dragon? Try to pick the lock? Dig a hole? The engine adapts to your creativity.
- **Context Awareness**: The AI remembers your past actions, your character class, and the current tone of the story.

### 2. State Tracking
The interface includes a dynamic sidebar that updates automatically:
- **Inventory**: If you find a "Rusted Key" in the story, it appears in your backpack. If you use it to open a door, it disappears.
- **Quests**: The "Current Quest" updates as you uncover the plot. It might shift from "Find shelter" to "Investigate the glowing ruins" seamlessly.
- **Map Journey**: As you travel to new distinct locations (e.g., "The Whispering Woods", "Ironhold Keep"), they are plotted on a visual map, tracking your path through the world.

### 3. Visual Immersion
- **Character Influence**: Your initial choice of Class (Warrior, Mage, Rogue, Ranger) and physical appearance is fed into the image generator. If you are a "Cyberpunk Mage with neon robes," the generated art will reflect that style in every scene.
- **Scene Rendering**: Every response from the AI comes with a unique, high-fidelity illustration depicting the current moment, created by the `gemini-3-pro-image-preview` model.

## Tips for Adventurers

- **Be Descriptive**: Instead of typing "I attack", try "I lunge forward with my sword, aiming for the beast's flank." The AI rewards descriptive roleplay with more vivid outcomes.
- **Think Outside the Box**: If you're stuck, check your inventory. Maybe that "Strange Amulet" you found three turns ago is the key.
- **Don't Fear the Refresh**: The game features a robust **Autosave** system. A small "Saving..." indicator appears after every turn. You can close the tab and "Continue Journey" right where you left off.
- **Experiment**: The engine is designed to handle failure. Getting captured or losing a fight can lead to interesting new story arcs.

## Technical Architecture & Game Loop

### The Loop
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

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Markdown**: `react-markdown` for rendering formatted story text.

## Usage

1. **API Key**: You must select a valid Google Cloud Project API Key with billing enabled (for Veo/Pro Vision features) when prompted.
2. **Start**: Click "Create Character" to define your hero.
3. **Play**: Type your actions into the input bar. There are no wrong choices.

## Future Enhancements

- **Bestiary**: A new tab in the sidebar to track monsters and enemies encountered during the journey.
- **Spell System**: A dedicated spellbook UI for Mage characters, allowing users to "cast" specific spells that influence the narrative prompt.
- **Combat Mechanics**: Implementing a lightweight dice-roll simulation in the background to determine the success or failure of combat actions based on character stats.
- **NPC Relationships**: Tracking standing/reputation with key characters met in the world.