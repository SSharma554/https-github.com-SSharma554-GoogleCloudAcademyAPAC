import React from 'react';
import { UserProfile } from '../types';
import { Sparkles, BookOpen, Plus, LogOut, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  activeView: 'editor' | 'history';
  onViewChange: (view: 'editor' | 'history') => void;
  onNewReflection: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  onViewChange,
  onNewReflection,
  onSignOut,
}) => {
  return (
    <header id="main-header" className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E0DBCF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <div 
            id="brand-logo-btn"
            onClick={() => onViewChange('editor')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#5A5A40] text-white flex items-center justify-center shadow-xs group-hover:bg-[#484832] transition-colors">
              <Sparkles className="w-5 h-5 text-[#EAE7DE]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#323228] text-base tracking-tight font-serif">ReflectAI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#F8F3ED] text-[#A57C52] border border-[#ECD5C3]">
                  Gemini 3.6
                </span>
              </div>
              <p className="text-[11px] text-[#858072] hidden sm:block">Private AI Journal & Reflections</p>
            </div>
          </div>

          {/* Navigation Links */}
          {user && (
            <nav className="flex items-center gap-1 ml-2 sm:ml-4">
              <button
                id="nav-editor-btn"
                onClick={() => onViewChange('editor')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeView === 'editor'
                    ? 'bg-[#EAE7DE] text-[#323228] font-semibold'
                    : 'text-[#666359] hover:text-[#323228] hover:bg-[#F0ECE1]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#858072]" />
                <span>Reflect</span>
              </button>

              <button
                id="nav-history-btn"
                onClick={() => onViewChange('history')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeView === 'history'
                    ? 'bg-[#EAE7DE] text-[#323228] font-semibold'
                    : 'text-[#666359] hover:text-[#323228] hover:bg-[#F0ECE1]'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#858072]" />
                <span>Past Entries</span>
              </button>
            </nav>
          )}
        </div>

        {/* Right Side Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            <button
              id="new-reflection-header-btn"
              onClick={onNewReflection}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#5A5A40] text-white text-sm font-medium hover:bg-[#484832] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry</span>
            </button>

            {/* User Profile Capsule */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E0DBCF]">
              {user.photoURL ? (
                <img
                  id="user-avatar-img"
                  src={user.photoURL}
                  alt={user.displayName || 'User profile'}
                  className="w-8 h-8 rounded-full border border-[#E0DBCF] object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div id="user-avatar-fallback" className="w-8 h-8 rounded-full bg-[#EAE7DE] text-[#5A5A40] font-semibold text-xs flex items-center justify-center">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-[#323228] leading-none truncate max-w-[130px]">
                  {user.displayName || 'Journaler'}
                </p>
                <span className="text-[10px] text-[#5A5A40] flex items-center gap-1 font-medium mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-[#5A5A40]" /> Firestore Isolated
                </span>
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                title="Sign Out"
                className="p-1.5 rounded-md text-[#858072] hover:text-[#323228] hover:bg-[#EAE7DE] transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#858072] hidden sm:inline flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" /> End-to-End Isolated
            </span>
          </div>
        )}

      </div>
    </header>
  );
};
