'use client';

import { Flame, Heart, Sparkles } from 'lucide-react';
import type { CommunityPost, ReactionType } from '@/lib/types';

export type CommunityReaction = Extract<ReactionType, 'encourage' | 'celebrate' | 'fire'>;

export interface ReactionBarProps {
  post: CommunityPost;
  /** The current user's reaction, if one has already been selected. */
  activeReaction?: CommunityReaction | null;
  /** Alias accepted by profile/feed callers that use a more explicit name. */
  userReaction?: CommunityReaction | null;
  onReact?: (reaction: CommunityReaction) => void;
}

const REACTIONS: ReadonlyArray<{
  type: CommunityReaction;
  label: string;
  icon: typeof Heart;
}> = [
  { type: 'encourage', label: 'Encourage', icon: Heart },
  { type: 'celebrate', label: 'Celebrate', icon: Sparkles },
  { type: 'fire', label: 'Fire', icon: Flame },
];

const countFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Three deliberately small, text-labelled reaction controls.  Labels remain
 * visible at mobile widths, while `aria-pressed` communicates the selected
 * state to screen readers and keyboard users.
 */
export function ReactionBar({
  post,
  activeReaction,
  userReaction,
  onReact,
}: ReactionBarProps) {
  const selected = activeReaction ?? userReaction ?? null;

  return (
    <div className="reaction-bar" dir="ltr" role="group" aria-label="React to this progress">
      {REACTIONS.map(({ type, label, icon: Icon }) => {
        const count = Number(post.reactions?.[type] ?? 0);
        const isActive = selected === type;
        return (
          <button
            key={type}
            type="button"
            className={`reaction-button ${isActive ? 'active' : ''}`}
            aria-label={`${label}${count > 0 ? `; ${countFormatter.format(count)} reactions` : ''}`}
            aria-pressed={isActive}
            onClick={() => onReact?.(type)}
          >
            <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
            <span>{label}</span>
            {count > 0 ? <b aria-hidden="true">{countFormatter.format(count)}</b> : null}
          </button>
        );
      })}
      <style jsx>{`
        .reaction-bar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          min-height: 44px;
        }
        .reaction-button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 10px;
          border: 1px solid var(--line, #333333);
          border-radius: 999px;
          background: transparent;
          color: var(--ink-soft, #999999);
          font: inherit;
          font-size: 11px;
          transition: color .2s var(--ease, ease), background .2s var(--ease, ease), border-color .2s var(--ease, ease), transform .2s var(--ease, ease);
        }
        .reaction-button:hover {
          border-color: var(--line-strong, #626262);
          color: var(--ink, #f7f7f7);
          transform: translateY(-1px);
        }
        .reaction-button:active { transform: translateY(0) scale(.97); }
        .reaction-button.active {
          border-color: var(--accent, #f7f7f7);
          background: var(--accent-soft, rgba(255, 255, 255, .12));
          color: var(--ink, #f7f7f7);
        }
        .reaction-button svg { color: var(--accent, #f7f7f7); flex: 0 0 auto; }
        .reaction-button b {
          color: var(--ink, #f7f7f7);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 600;
          direction: ltr;
        }
        @media (max-width: 400px) {
          .reaction-button { padding-inline: 8px; }
          .reaction-button span { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}

export default ReactionBar;
