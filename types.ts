
export interface GameState {
  inventory: string[];
  currentQuest: string;
  history: StoryTurn[];
  isGenerating: boolean;
  gameStarted: boolean;
  character?: Character;
  locationHistory: string[];
  suggestedActions?: string[];
  activeCharacters?: NPC[];
}

export interface Character {
  name: string;
  class: string;
  appearance: string;
}

export interface NPC {
  name: string;
  description: string;
}

export interface StoryTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  imagePrompt?: string; // Stored for debugging or regeneration context
  timestamp: number;
}

export interface AIResponse {
  narrative: string;
  visualDescription: string;
  inventory: string[];
  currentQuest: string;
  suggestedActions: string[];
  locationName: string;
  activeCharacters: NPC[];
}

export enum ImageSize {
  Size_1K = '1K',
  Size_2K = '2K',
  Size_4K = '4K'
}

export type Language = 'en' | 'ru';

export type AIProvider = 'gemini' | 'mistral';

export interface GameSettings {
  imageSize: ImageSize;
  language: Language;
  provider: AIProvider;
  mistralKey?: string;
}
