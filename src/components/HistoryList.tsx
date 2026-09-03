import React, { useState, useMemo } from 'react';
import { JournalInteraction, ReflectionMode } from '../types';
import { 
  Search, 
  Calendar, 
  Sparkles, 
  Trash2, 
  ArrowUpRight, 
  Tag, 
  BookOpen, 
  Filter, 
  MessageSquare,
  Plus
} from 'lucide-react';

interface HistoryListProps {
  interactions: JournalInteraction[];
  isLoading: boolean;
  onSelectInteraction: (interaction: JournalInteraction) => void;
  onDeleteInteraction: (id: string) => Promise<void>;
  onNewReflection: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  interactions,
  isLoading,
  onSelectInteraction,
  onDeleteInteraction,
  onNewReflection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      // Search filter
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.synthesis?.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.synthesis?.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      // Mode filter
      const matchesMode = selectedMode === 'all' || item.mode === selectedMode;

      // Mood filter
      const matchesMood = selectedMood === 'all' || item.synthesis?.mood === selectedMood;

      return matchesSearch && matchesMode && matchesMood;
    });
  }, [interactions, searchQuery, selectedMode, selectedMood]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* Top Header & Search Bar */}
      <div className="bg-[#FAF9F6] rounded-2xl border border-[#E0DBCF] p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#323228] tracking-tight">Your Reflection Archive</h1>
            <p className="text-sm text-[#858072] mt-0.5">
              Securely stored and isolated in your private Cloud Firestore collection ({interactions.length} entries)
            </p>
          </div>

          <button
            id="history-new-reflection-btn"
            onClick={onNewReflection}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A5A40] text-white text-sm font-medium hover:bg-[#484832] transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-[#858072] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections by title, content, or #tag..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F5F5F0] border border-[#E0DBCF] text-sm text-[#323228] focus:outline-hidden focus:border-[#5A5A40] focus:bg-white transition-colors"
            />
          </div>

          {/* Mode Filter */}
          <div className="relative">
            <select
              id="history-mode-filter"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F5F5F0] border border-[#E0DBCF] text-sm text-[#4A4A40] focus:outline-hidden focus:border-[#5A5A40] focus:bg-white transition-colors"
            >
              <option value="all">All Reflection Lenses</option>
              <option value="reflection">Self-Reflection</option>
              <option value="brainstorm">Brainstorming</option>
              <option value="coaching">Clarity & Coaching</option>
              <option value="gratitude">Gratitude & Growth</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-[#FAF9F6] rounded-2xl border border-[#E0DBCF] p-5 space-y-3 animate-pulse">
              <div className="h-5 bg-[#EAE7DE] rounded w-2/3" />
              <div className="h-4 bg-[#F0ECE1] rounded w-full" />
              <div className="h-4 bg-[#F0ECE1] rounded w-4/5" />
              <div className="h-4 bg-[#F0ECE1] rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredInteractions.length === 0 && (
        <div className="bg-[#FAF9F6] rounded-2xl border border-[#E0DBCF] p-8 sm:p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EDECE4] text-[#5A5A40] mx-auto flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-base font-serif font-bold text-[#323228]">
              {searchQuery || selectedMode !== 'all' ? 'No matching reflections found' : 'No reflections yet'}
            </h3>
            <p className="text-xs text-[#858072]">
              {searchQuery || selectedMode !== 'all'
                ? 'Try adjusting your search keywords or lens filters.'
                : 'Start your first reflective dialogue with Gemini 3.6 Flash today.'}
            </p>
          </div>
          <button
            id="empty-state-new-reflection-btn"
            onClick={onNewReflection}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A5A40] text-white text-xs font-medium hover:bg-[#484832] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Entry</span>
          </button>
        </div>
      )}

      {/* Interaction Cards Grid */}
      {!isLoading && filteredInteractions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInteractions.map((item) => {
            const firstSnippet = item.messages[0]?.content || 'Empty entry';
            const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={item.id}
                id={`history-card-${item.id}`}
                onClick={() => onSelectInteraction(item)}
                className="group bg-[#FAF9F6] rounded-2xl border border-[#E0DBCF] hover:border-[#CDC6B8] p-5 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between cursor-pointer space-y-4"
              >
                <div className="space-y-2.5">
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EDECE4] text-[#5A5A40] border border-[#D8D4C5]">
                      {item.mode}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-[#858072]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-[#323228] text-base group-hover:text-[#5A5A40] transition-colors line-clamp-1">
                    {item.title}
                  </h3>

                  {/* Executive Summary Snippet OR First Message Snippet */}
                  <p className="text-xs text-[#555548] line-clamp-3 leading-relaxed">
                    {item.synthesis?.summary || firstSnippet}
                  </p>
                </div>

                {/* Bottom Tags & Metrics Row */}
                <div className="pt-3 border-t border-[#EAE7DE] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.synthesis?.tags?.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="text-[10px] text-[#858072] bg-[#F5F5F0] px-1.5 py-0.5 rounded border border-[#E0DBCF]">
                        #{tag}
                      </span>
                    ))}
                    {item.synthesis && (
                      <span className="text-[10px] font-semibold text-[#A57C52] bg-[#F8F3ED] px-1.5 py-0.5 rounded border border-[#ECD5C3] flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-[#A57C52]" /> Synthesized
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[#858072] shrink-0">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> {item.messages.length}
                    </span>
                    
                    {deletingId === item.id ? (
                      <div 
                        className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[11px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-rose-700 font-medium">Delete?</span>
                        <button
                          id={`confirm-delete-card-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(null);
                            onDeleteInteraction(item.id);
                          }}
                          className="px-1.5 py-0.2 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          id={`cancel-delete-card-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(null);
                          }}
                          className="px-1 text-neutral-600 hover:text-neutral-900 cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`delete-history-btn-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(item.id);
                        }}
                        title="Delete entry"
                        className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <ArrowUpRight className="w-4 h-4 text-[#858072] group-hover:text-[#323228] transition-colors" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
