import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Database, 
  Cpu, 
  MessageSquareText, 
  CheckCircle2, 
  ArrowRight,
  Lightbulb
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  isAuthenticating: boolean;
  authError: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  isAuthenticating,
  authError,
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-16 w-full">
        
        {/* Top Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8F3ED] border border-[#ECD5C3] text-[#A57C52] text-xs font-medium shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#A57C52]" />
            <span>Multi-Turn Reflections & Synthesis Powered by Gemini 3.6 Flash</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-[#323228] text-balance leading-tight">
            A private space to write, reflect, and discover clarity.
          </h1>
          <p className="text-lg text-[#555548] max-w-2xl mx-auto font-normal leading-relaxed">
            ReflectAI is your personal multi-turn journaling sanctuary. Converse with Gemini for grounded reflections, brainstorming, and executive summaries—stored securely in your own isolated Firestore container.
          </p>
        </div>

        {/* Call to Action Button */}
        <div className="mt-8 flex flex-col items-center justify-center gap-4">
          <button
            id="google-signin-hero-btn"
            onClick={onSignIn}
            disabled={isAuthenticating}
            className="group relative inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl bg-[#5A5A40] text-white font-medium text-base shadow-sm hover:bg-[#484832] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-md cursor-pointer"
          >
            {isAuthenticating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                />
              </svg>
            )}
            <span>{isAuthenticating ? 'Signing in with Google...' : 'Continue with Google Account'}</span>
            {!isAuthenticating && (
              <ArrowRight className="w-4 h-4 text-[#D8D2C4] group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>

          {authError && (
            <div id="auth-error-banner" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-lg max-w-md text-center">
              {authError}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-[#858072] mt-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40]" /> Firebase Auth
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40]" /> Private Firestore Rules
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5A5A40]" /> No Password Storage
            </span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-[#E0DBCF] shadow-2xs hover:border-[#CDC6B8] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#F8F3ED] text-[#A57C52] flex items-center justify-center mb-4">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-[#323228] text-base mb-1.5">Multi-Turn AI Reflections</h3>
            <p className="text-[#555548] text-sm leading-relaxed">
              Have nuanced, back-and-forth conversations with Gemini 3.6 Flash. Unpack complex feelings, explore challenges, or seek fresh cognitive perspectives.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-[#E0DBCF] shadow-2xs hover:border-[#CDC6B8] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#EDECE4] text-[#5A5A40] flex items-center justify-center mb-4">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-[#323228] text-base mb-1.5">AI Synthesis & Key Takeaways</h3>
            <p className="text-[#555548] text-sm leading-relaxed">
              Automatically distill lengthy journal entries into concise executive summaries, actionable insights, sentiment cues, and thematic tags with a single click.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-[#E0DBCF] shadow-2xs hover:border-[#CDC6B8] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#F0ECE1] text-[#6E6E52] flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-[#323228] text-base mb-1.5">User-Isolated Firestore</h3>
            <p className="text-[#555548] text-sm leading-relaxed">
              Every reflection document is locked to your verified UID under owner-only security rules. No cross-user reads or external data exposure.
            </p>
          </div>

        </div>

        {/* Architecture & Tech Stack Card */}
        <div className="mt-12 p-6 rounded-2xl bg-[#323228] text-[#F5F5F0] shadow-sm border border-[#48483A]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#48483A]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#A57C52]" />
              <h2 className="font-serif font-semibold text-base text-white">Production Security Architecture</h2>
            </div>
            <span className="text-xs font-mono text-[#D8D2C4] bg-[#434336] px-2.5 py-1 rounded">
              OWASP & Zero-Trust Aligned
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-xs">
            <div>
              <span className="text-[#A6A295] block mb-1 font-medium">User Identity</span>
              <p className="text-[#F5F5F0] font-semibold">Firebase Google Sign-In</p>
              <p className="text-[#A6A295] text-[11px] mt-0.5">Federated OAuth, zero passwords</p>
            </div>
            <div>
              <span className="text-[#A6A295] block mb-1 font-medium">Database Layer</span>
              <p className="text-[#F5F5F0] font-semibold">Cloud Firestore</p>
              <p className="text-[#A6A295] text-[11px] mt-0.5">Strict subcollection isolation</p>
            </div>
            <div>
              <span className="text-[#A6A295] block mb-1 font-medium">AI Intelligence</span>
              <p className="text-[#F5F5F0] font-semibold">Gemini 3.6 Flash</p>
              <p className="text-[#A6A295] text-[11px] mt-0.5">Resilient multi-tier fallback ladder</p>
            </div>
            <div>
              <span className="text-[#A6A295] block mb-1 font-medium">Secret Management</span>
              <p className="text-[#F5F5F0] font-semibold">GCP Secret Manager</p>
              <p className="text-[#A6A295] text-[11px] mt-0.5">Zero hardcoded API secrets</p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-[#E0DBCF] text-center text-xs text-[#858072]">
        <p>ReflectAI &bull; Built with Google Gemini API & Cloud Firestore</p>
      </footer>
    </div>
  );
};
