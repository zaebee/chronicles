import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, Loader2, Sparkles, Image as ImageIcon, Bot, Globe, Compass, Backpack, X, Shield, Sword, Wand, Feather, User, AlertTriangle, Menu, Save, History } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { StoryCard } from './components/StoryCard';
import { generateStorySegment, generateSceneImage } from './services/geminiService';
import { GameState, StoryTurn, ImageSize, Language, Character } from './types';

const SAVE_KEY = 'chronicle_save_v1';

// Translation Dictionary
const CONTENT = {
  en: {
    startTitle: "CHRONICLE",
    startSubtitle: "An Infinite Choose-Your-Own-Adventure Engine",
    selectRes: "Select Image Resolution (Gemini Pro Image)",
    beginBtn: "Create Character",
    continueBtn: "Continue Journey",
    embarkBtn: "Embark",
    loading: "Summoning World...",
    headerTitle: "CHRONICLE",
    settingsTitle: "Settings",
    imageResTitle: "Image Resolution",
    langTitle: "Language",
    inputPlaceholder: "What do you want to do?",
    startPrompt: "Start a new fantasy adventure. Describe the setting where I wake up. Give me a starting quest.",
    questLabel: "Current Quest",
    inventoryLabel: "Inventory",
    journalLabel: "Journal",
    mapLabel: "Map",
    emptyInventory: "Your pack is empty.",
    awaitingQuest: "Awaiting adventure...",
    engineVersion: "Chronicle Engine v1.0",
    errorKey: "Failed to start game. Please check your API Key.",
    errorGen: "Something went wrong. The spirits are silent.",
    rateLimit: "The spirits are exhausted (API Limit Reached). Please wait a moment before trying again.",
    saving: "Saving...",
    initialActions: ["Look around", "Check inventory", "Yell for help"],
    // Tutorial
    tutorialTitle: "How to Play",
    tutChoiceTitle: "Total Freedom",
    tutChoiceDesc: "Type any action you can imagine. The story adapts to your choices in real-time.",
    tutMechTitle: "Dynamic World",
    tutMechDesc: "Your Inventory and Quests are tracked and updated automatically by the AI as you explore.",
    tutBtn: "Understood",
    // Character Creation
    createTitle: "Who are you?",
    nameLabel: "Name",
    classLabel: "Class",
    descLabel: "Appearance",
    descPlaceholder: "e.g., A scarred veteran with a silver eye...",
    classes: {
      warrior: "Warrior",
      mage: "Mage",
      rogue: "Rogue",
      ranger: "Ranger"
    }
  },
  ru: {
    startTitle: "ХРОНИКИ",
    startSubtitle: "Бесконечное интерактивное приключение",
    selectRes: "Выберите разрешение (Gemini Pro Image)",
    beginBtn: "Создать персонажа",
    continueBtn: "Продолжить путь",
    embarkBtn: "Начать путь",
    loading: "Создание мира...",
    headerTitle: "ХРОНИКИ",
    settingsTitle: "Настройки",
    imageResTitle: "Разрешение изображения",
    langTitle: "Язык",
    inputPlaceholder: "Что вы хотите сделать?",
    startPrompt: "Начни новое фэнтези приключение. Опиши место, где я просыпаюсь. Дай мне стартовый квест.",
    questLabel: "Текущий квест",
    inventoryLabel: "Инвентарь",
    journalLabel: "Журнал",
    mapLabel: "Карта",
    emptyInventory: "Рюкзак пуст.",
    awaitingQuest: "В ожидании приключений...",
    engineVersion: "Движок Chronicle v1.0",
    errorKey: "Не удалось начать игру. Проверьте ваш API ключ.",
    errorGen: "Что-то пошло не так. Духи молчат.",
    rateLimit: "Духи истощены (Лимит API). Пожалуйста, подождите немного перед повторной попыткой.",
    saving: "Сохранение...",
    initialActions: ["Осмотреться", "Проверить инвентарь", "Позвать на помощь"],
    // Tutorial
    tutorialTitle: "Как играть",
    tutChoiceTitle: "Полная свобода",
    tutChoiceDesc: "Пишите любые действия. Сюжет подстраивается под ваши решения в реальном времени.",
    tutMechTitle: "Живой мир",
    tutMechDesc: "Ваш Инвентарь и Квесты автоматически отслеживаются и обновляются ИИ по мере исследования.",
    tutBtn: "Понятно",
    // Character Creation
    createTitle: "Кто вы?",
    nameLabel: "Имя",
    classLabel: "Класс",
    descLabel: "Внешность",
    descPlaceholder: "напр., Опытный воин со шрамом на лице...",
    classes: {
      warrior: "Воин",
      mage: "Маг",
      rogue: "Плут",
      ranger: "Следопыт"
    }
  }
};

// Initial Game State
const INITIAL_STATE: GameState = {
  inventory: [],
  currentQuest: "",
  history: [],
  isGenerating: false,
  gameStarted: false,
  locationHistory: [],
};

type ViewState = 'welcome' | 'create' | 'game';

const CLASSES = [
  { id: 'warrior', icon: Sword, color: 'text-red-500', bg: 'bg-red-500/20' },
  { id: 'mage', icon: Wand, color: 'text-blue-500', bg: 'bg-blue-500/20' },
  { id: 'rogue', icon: User, color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
  { id: 'ranger', icon: Feather, color: 'text-amber-500', bg: 'bg-amber-500/20' },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [viewState, setViewState] = useState<ViewState>('welcome');
  const [language, setLanguage] = useState<Language>('en');
  const [input, setInput] = useState('');
  const [suggestedActions, setSuggestedActions] = useState<string[]>(CONTENT.en.initialActions);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.Size_1K);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('chronicle_tutorial_seen');
    }
    return false;
  });
  
  // Autosave State
  const [isSaving, setIsSaving] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  // Character Creation State
  const [charName, setCharName] = useState('');
  const [charClass, setCharClass] = useState('warrior');
  const [charDesc, setCharDesc] = useState('');
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewState === 'welcome') {
      setSuggestedActions(CONTENT[language].initialActions);
    }
  }, [language, viewState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.history, gameState.isGenerating, error]);

  // Check for save on mount
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      setHasSave(true);
    }
  }, []);

  // Autosave Effect
  useEffect(() => {
    if (gameState.gameStarted && !gameState.isGenerating && gameState.history.length > 0) {
      const saveData = {
        gameState,
        suggestedActions,
        timestamp: Date.now()
      };
      
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      
      // Visual feedback
      setIsSaving(true);
      setHasSave(true);
      const timer = setTimeout(() => setIsSaving(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, suggestedActions]);

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('chronicle_tutorial_seen', 'true');
  };

  const loadGame = () => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.gameState && data.suggestedActions) {
           setGameState(data.gameState);
           setSuggestedActions(data.suggestedActions);
           setViewState('game');
        }
      }
    } catch (e) {
      console.error("Failed to load save:", e);
      alert("Corrupted save file found.");
    }
  };

  const handleCreateClick = () => {
    setViewState('create');
  };

  // Helper to update location history only if the new location is different from the last
  const updateLocations = (history: string[], newLocation: string): string[] => {
    if (!newLocation) return history;
    const lastLocation = history[history.length - 1];
    // Simple string normalization to avoid duplicate "Forest" vs "Forest " entries
    if (lastLocation && lastLocation.trim().toLowerCase() === newLocation.trim().toLowerCase()) {
      return history;
    }
    return [...history, newLocation.trim()];
  };

  // Helper to parse errors and return user friendly message
  const getErrorMessage = (e: any, t: typeof CONTENT['en']) => {
    const msg = e?.message || JSON.stringify(e);
    if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return t.rateLimit;
    }
    return t.errorGen;
  };

  const startGame = useCallback(async () => {
    setError(null);
    // API Key Selection for Gemini 3 Pro Image Preview
    const w = window as any;
    if (w.aistudio) {
      try {
        const hasKey = await w.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await w.aistudio.openSelectKey();
        }
      } catch (e) {
        console.error("API Key selection error:", e);
      }
    }

    const t = CONTENT[language];
    const character: Character = {
      name: charName || "Traveler",
      class: t.classes[charClass as keyof typeof t.classes],
      appearance: charDesc
    };

    setGameState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      gameStarted: true,
      character: character
    }));
    setViewState('game');
    
    try {
      // Construct the prompt with character details
      const basePrompt = t.startPrompt;
      const charDetails = language === 'ru' 
        ? `Меня зовут ${character.name}, я ${character.class}. Моя внешность: ${character.appearance || "обычная"}.`
        : `My name is ${character.name}, I am a ${character.class}. My appearance: ${character.appearance || "nondescript"}.`;
      
      const fullPrompt = `${basePrompt} ${charDetails}`;
      
      const aiResponse = await generateStorySegment(fullPrompt, [], [], "", language);
      const imageUrl = await generateSceneImage(aiResponse.visualDescription, imageSize);

      const newTurn: StoryTurn = {
        id: Date.now().toString(),
        role: 'model',
        text: aiResponse.narrative,
        imageUrl: imageUrl,
        imagePrompt: aiResponse.visualDescription,
        timestamp: Date.now(),
      };

      setGameState(prev => ({
        ...prev,
        history: [newTurn],
        inventory: aiResponse.inventory,
        currentQuest: aiResponse.currentQuest,
        locationHistory: updateLocations([], aiResponse.locationName),
        isGenerating: false,
      }));
      setSuggestedActions(aiResponse.suggestedActions);
    } catch (error) {
      console.error(error);
      setGameState(prev => ({ ...prev, isGenerating: false, gameStarted: false }));
      setViewState('welcome');
      alert(t.errorKey); 
    }
  }, [imageSize, language, charName, charClass, charDesc]);

  const handleAction = async (actionText: string) => {
    if (!actionText.trim() || gameState.isGenerating) return;

    setError(null);

    const userTurn: StoryTurn = {
      id: Date.now().toString(),
      role: 'user',
      text: actionText,
      timestamp: Date.now(),
    };

    setGameState(prev => ({
      ...prev,
      history: [...prev.history, userTurn],
      isGenerating: true,
    }));
    setInput('');
    setSuggestedActions([]);

    try {
      const apiHistory = gameState.history.map(turn => ({
        role: turn.role,
        parts: [{ text: turn.text }]
      }));

      apiHistory.push({ role: 'user', parts: [{ text: actionText }] });

      const aiResponse = await generateStorySegment(
        actionText, 
        apiHistory.slice(0, -1),
        gameState.inventory, 
        gameState.currentQuest,
        language
      );

      const imageUrl = await generateSceneImage(aiResponse.visualDescription, imageSize);

      const modelTurn: StoryTurn = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponse.narrative,
        imageUrl: imageUrl,
        imagePrompt: aiResponse.visualDescription,
        timestamp: Date.now(),
      };

      setGameState(prev => ({
        ...prev,
        history: [...prev.history, modelTurn],
        inventory: aiResponse.inventory,
        currentQuest: aiResponse.currentQuest,
        locationHistory: updateLocations(prev.locationHistory, aiResponse.locationName),
        isGenerating: false,
      }));
      setSuggestedActions(aiResponse.suggestedActions);

    } catch (e) {
      console.error(e);
      setGameState(prev => ({ ...prev, isGenerating: false }));
      setError(getErrorMessage(e, CONTENT[language]));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAction(input);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (error) setError(null);
  };

  const t = CONTENT[language];

  // Welcome Screen
  if (viewState === 'welcome') {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-transparent"></div>

        {/* Language Selector */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded text-sm ${language === 'en' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>English</button>
            <button onClick={() => setLanguage('ru')} className={`px-3 py-1 rounded text-sm ${language === 'ru' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Русский</button>
        </div>

        {/* Tutorial Modal */}
        {showTutorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-700 p-6 md:p-8 rounded-2xl max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button 
                onClick={closeTutorial}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-serif text-amber-500 mb-6 text-center">{t.tutorialTitle}</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="bg-zinc-800 p-3 rounded-lg h-fit shrink-0">
                    <Compass className="text-amber-500" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-200 mb-1">{t.tutChoiceTitle}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{t.tutChoiceDesc}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-zinc-800 p-3 rounded-lg h-fit shrink-0">
                    <Backpack className="text-amber-500" size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-zinc-200 mb-1">{t.tutMechTitle}</h3>
                     <p className="text-sm text-zinc-400 leading-relaxed">{t.tutMechDesc}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={closeTutorial}
                className="w-full mt-8 bg-zinc-100 hover:bg-white text-zinc-900 font-bold py-3 rounded-xl transition-colors"
              >
                {t.tutBtn}
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 max-w-lg w-full text-center space-y-8 animate-fade-in-up">
          <div className="inline-block p-4 rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
             <Sparkles className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight drop-shadow-xl font-serif">
            {t.startTitle}
          </h1>
          <p className="text-xl text-neutral-400 font-light">
            {t.startSubtitle}
          </p>

           {/* Image Quality Settings */}
           <div className="flex flex-col items-center gap-2 py-4">
             <div className="bg-black/40 backdrop-blur-sm p-1 rounded-lg flex border border-white/10">
               {Object.values(ImageSize).map((size) => (
                 <button
                   key={size}
                   onClick={() => setImageSize(size)}
                   className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                     imageSize === size 
                       ? 'bg-amber-600 text-white shadow-lg' 
                       : 'text-zinc-400 hover:text-white hover:bg-white/5'
                   }`}
                 >
                   {size}
                 </button>
               ))}
             </div>
             <p className="text-xs text-zinc-500">{t.selectRes}</p>
           </div>

          <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch">
            {/* Continue Button */}
            {hasSave && (
               <button
                  onClick={loadGame}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-zinc-100 transition-all duration-200 bg-zinc-800 font-serif rounded-lg hover:bg-zinc-700 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-600"
               >
                 <span className="flex items-center gap-2">
                   <History size={20} className="text-amber-500" /> {t.continueBtn}
                 </span>
               </button>
            )}

            <button
              onClick={handleCreateClick}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-amber-600 font-serif rounded-lg hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600"
            >
                <span className="flex items-center gap-2">
                  {t.beginBtn} <User size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              <div className="absolute -inset-3 rounded-lg bg-amber-400 opacity-20 group-hover:opacity-40 blur transition duration-200"></div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Character Creation Screen
  if (viewState === 'create') {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 font-sans relative">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542256844-3158d1d86d26?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="absolute top-4 left-4 z-20">
             <button onClick={() => setViewState('welcome')} className="text-zinc-500 hover:text-zinc-300 flex items-center gap-2">
                 <X size={20} /> <span className="text-sm">Back</span>
             </button>
        </div>

        <div className="max-w-xl w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 shadow-2xl z-10 backdrop-blur animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-3xl font-serif text-amber-500 mb-8 text-center border-b border-zinc-800 pb-4">
             {t.createTitle}
          </h2>

          <div className="space-y-6">
             {/* Name */}
             <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.nameLabel}</label>
                <input 
                  type="text" 
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-700 rounded-lg p-3 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                />
             </div>

             {/* Class Selection */}
             <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.classLabel}</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CLASSES.map((cls) => {
                        const isSelected = charClass === cls.id;
                        return (
                            <button
                                key={cls.id}
                                onClick={() => setCharClass(cls.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
                                    isSelected 
                                    ? 'bg-zinc-800 border-amber-500 shadow-lg shadow-amber-900/20' 
                                    : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                                }`}
                            >
                                <div className={`p-2 rounded-full mb-2 ${isSelected ? cls.bg : 'bg-zinc-800'}`}>
                                    <cls.icon size={20} className={isSelected ? cls.color : 'text-zinc-500'} />
                                </div>
                                <span className={`text-xs font-bold ${isSelected ? 'text-zinc-100' : 'text-zinc-500'}`}>
                                    {t.classes[cls.id as keyof typeof t.classes]}
                                </span>
                            </button>
                        )
                    })}
                </div>
             </div>

             {/* Appearance */}
             <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.descLabel}</label>
                <textarea 
                   value={charDesc}
                   onChange={(e) => setCharDesc(e.target.value)}
                   placeholder={t.descPlaceholder}
                   rows={3}
                   className="w-full bg-black/40 border border-zinc-700 rounded-lg p-3 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none"
                />
             </div>

             <div className="pt-6">
                <button
                    onClick={startGame}
                    className="w-full group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-amber-600 font-serif rounded-lg hover:bg-amber-500 hover:-translate-y-0.5 shadow-lg shadow-amber-900/20"
                >
                     {gameState.isGenerating ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin" /> {t.loading}
                        </span>
                        ) : (
                        <span className="flex items-center gap-2">
                            {t.embarkBtn} <Compass size={20} className="group-hover:rotate-45 transition-transform duration-500" />
                        </span>
                    )}
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Game Interface
  return (
    <div className="flex h-screen bg-neutral-900 text-zinc-100 overflow-hidden font-sans">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-0">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowMobileMenu(true)}
                className="md:hidden text-zinc-400 hover:text-white"
             >
                <Menu size={24} />
             </button>
            <h1 className="text-xl font-bold font-serif tracking-wider text-amber-500">{t.headerTitle}</h1>
            {gameState.character && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700">
                <User size={14} className="text-zinc-400" />
                <span className="text-xs font-bold text-zinc-300">{gameState.character.name}</span>
                <span className="text-xs text-zinc-500">•</span>
                <span className="text-xs text-amber-500">{gameState.character.class}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-400 hover:bg-zinc-800'}`}
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Settings Popover */}
        {showSettings && (
          <div className="absolute top-16 right-6 z-30 w-72 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
              <Globe size={16} /> {t.langTitle}
            </h3>
             <div className="flex bg-zinc-900/50 rounded-lg p-1 mb-4">
              <button 
                onClick={() => setLanguage('en')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${language === 'en' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                English
              </button>
              <button 
                onClick={() => setLanguage('ru')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${language === 'ru' ? 'bg-amber-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                Русский
              </button>
            </div>

            <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
              <ImageIcon size={16} /> {t.imageResTitle}
            </h3>
            <div className="space-y-2">
              {Object.values(ImageSize).map((size) => (
                <button
                  key={size}
                  onClick={() => setImageSize(size)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    imageSize === size 
                      ? 'bg-amber-600/20 text-amber-500 border border-amber-600/50' 
                      : 'bg-zinc-900/50 text-zinc-400 border border-transparent hover:bg-zinc-700'
                  }`}
                >
                  <span>{size}</span>
                  {imageSize === size && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Story Feed */}
        <div className="flex-1 overflow-y-auto px-4 md:px-20 py-8 scroll-smooth" id="scroll-container">
          <div className="max-w-4xl mx-auto">
            {gameState.history.map((turn, index) => (
              <StoryCard 
                key={turn.id} 
                turn={turn} 
                isLast={index === gameState.history.length - 1} 
              />
            ))}
            
            {gameState.isGenerating && (
              <div className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                   <Bot size={24} className="text-zinc-600" />
                </div>
                <div className="space-y-3 flex-1 mt-2">
                  <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                  <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                  <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
        
        {/* Autosave Indicator */}
        <div className={`fixed bottom-4 right-4 z-40 bg-zinc-900/80 backdrop-blur border border-amber-900/50 px-3 py-1.5 rounded-full flex items-center gap-2 transition-opacity duration-500 pointer-events-none ${isSaving ? 'opacity-100' : 'opacity-0'}`}>
           <Save size={14} className="text-amber-500 animate-pulse" />
           <span className="text-xs text-amber-500 font-medium tracking-wide">{t.saving}</span>
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md p-6">
          <div className="max-w-4xl mx-auto space-y-4">

            {/* Error Banner */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-red-200 text-sm">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Suggestions */}
            {!gameState.isGenerating && suggestedActions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(action)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-full border border-zinc-700 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t.inputPlaceholder}
                disabled={gameState.isGenerating}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-xl pl-6 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition-all disabled:opacity-50"
                autoFocus
              />
              <button
                onClick={() => handleAction(input)}
                disabled={!input.trim() || gameState.isGenerating}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-amber-600 text-white rounded-lg flex items-center justify-center hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors"
              >
                {gameState.isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <div className="hidden md:block">
        <Sidebar 
           inventory={gameState.inventory} 
           currentQuest={gameState.currentQuest}
           locationHistory={gameState.locationHistory}
           labels={{
             journal: t.journalLabel,
             quest: t.questLabel,
             inventory: t.inventoryLabel,
             map: t.mapLabel,
             empty: t.emptyInventory,
             awaiting: t.awaitingQuest,
             version: t.engineVersion
           }}
        />
      </div>

      {/* Mobile Sidebar Overlay/Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden font-sans">
           <div 
             className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
             onClick={() => setShowMobileMenu(false)} 
           />
           <div className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900 shadow-2xl animate-in slide-in-from-right duration-300 border-l border-zinc-800">
              <div className="flex justify-end p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
                 <button 
                   onClick={() => setShowMobileMenu(false)} 
                   className="text-zinc-400 hover:text-white p-1"
                 >
                    <X size={24} />
                 </button>
              </div>
              <div className="h-[calc(100%-64px)]">
                <Sidebar 
                  inventory={gameState.inventory} 
                  currentQuest={gameState.currentQuest}
                  locationHistory={gameState.locationHistory}
                  labels={{
                    journal: t.journalLabel,
                    quest: t.questLabel,
                    inventory: t.inventoryLabel,
                    map: t.mapLabel,
                    empty: t.emptyInventory,
                    awaiting: t.awaitingQuest,
                    version: t.engineVersion
                  }}
                />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}