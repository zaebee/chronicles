import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { StoryTurn } from '../types';

interface StoryCardProps {
  turn: StoryTurn;
  isLast: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({ turn, isLast }) => {
  const isUser = turn.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-8 animate-fade-in-up">
        <div className="bg-zinc-800 text-zinc-100 px-6 py-4 rounded-2xl rounded-tr-none max-w-2xl border border-zinc-700 shadow-lg relative">
          <div className="absolute -top-3 -right-3 bg-zinc-700 p-1.5 rounded-full border border-zinc-600">
             <User size={16} className="text-zinc-300" />
          </div>
          <p className="text-lg leading-relaxed font-light">{turn.text}</p>
        </div>
      </div>
    );
  }

  // Model Turn
  return (
    <div className="mb-12 animate-fade-in-up group">
      <div className="flex gap-4">
        <div className="flex-shrink-0 mt-2">
          <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-900/20">
            <Bot size={24} className="text-white" />
          </div>
        </div>
        
        <div className="flex-1 space-y-6">
          {/* Narrative Text */}
          <div className="prose prose-invert prose-lg max-w-none text-zinc-200 leading-8">
            <ReactMarkdown>{turn.text}</ReactMarkdown>
          </div>

          {/* Generated Image */}
          {turn.imageUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-zinc-700 shadow-2xl mt-6 group-hover:shadow-amber-900/10 transition-all duration-500">
              <img 
                src={turn.imageUrl} 
                alt="Scene illustration" 
                className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-1000 ease-out"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs text-zinc-400 truncate font-mono">
                  Prompt: {turn.imagePrompt || "Generated scene"}
                </p>
              </div>
            </div>
          ) : (
            // Placeholder/Loading State for image if it's missing but expected? 
            // Usually we only create the card once we have the data, 
            // but we could have a "generating image..." state here if we wanted async loading.
            // For this implementation, we wait for image before adding the turn.
            null
          )}
        </div>
      </div>
    </div>
  );
};