/* eslint-disable @next/next/no-img-element -- feed avatars may be data URLs or signed hosted URLs. */
'use client';

import {
  Camera,
  CircleCheck,
  Flame,
  Footprints,
  Scale,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { CommunityPost, User } from '@/lib/types';
import ReactionBar, { type CommunityReaction } from './ReactionBar';

export interface ProgressPostProps {
  post: CommunityPost;
  /** Optional author override for callers rendering a denormalized post. */
  author?: Pick<User, 'displayName' | 'initials' | 'avatarUrl'>;
  activeReaction?: CommunityReaction | null;
  userReaction?: CommunityReaction | null;
  onReact?: (reaction: CommunityReaction) => void;
  /** Alias retained for feed implementations that name the callback this way. */
  onReaction?: (reaction: CommunityReaction) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const typeMeta: Record<CommunityPost['type'], {
  label: string;
  icon: typeof Scale;
}> = {
  weight_loss: { label: 'Weight loss', icon: Scale },
  streak: { label: 'Consistency streak', icon: Footprints },
  goal_milestone: { label: 'Goal milestone', icon: Trophy },
  milestone: { label: 'Goal milestone', icon: Trophy },
  photo: { label: 'Progress photo', icon: Camera },
  custom: { label: 'New progress', icon: Sparkles },
};

function displayDate(value: string): string {
  const parsed = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.[0] || '?').toUpperCase();
}

function metricText(post: CommunityPost): string | null {
  if (!Number.isFinite(post.metricValue)) return null;
  const value = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Math.abs(post.metricValue!));
  const label = post.type === 'weight_loss' || post.type === 'goal_milestone'
    ? 'kg lost'
    : post.type === 'streak'
      ? 'day streak'
      : post.type === 'photo'
        ? 'progress photo'
        : post.metricLabel || '';
  return `${value}${label ? ` ${label}` : ''}`;
}

function copyForPost(post: CommunityPost): string {
  if (!post.generated) return post.copy || post.body || post.text || 'A new step in the journey was recorded.';
  const value = Number.isFinite(post.metricValue)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Math.abs(post.metricValue!))
    : '';
  switch (post.type) {
    case 'weight_loss':
      return value ? `${value} kg lighter since the previous check-in. Slow and steady.` : 'A lighter check-in. Slow and steady.';
    case 'streak':
      return value ? `${value} days of logging complete. Consistency beats perfection.` : 'A consistency milestone reached.';
    case 'goal_milestone':
    case 'milestone':
      return value ? `${value} kg closer to the goal. Small steps add up.` : 'A meaningful goal milestone reached.';
    case 'photo':
      return 'A new progress photo was added to the journey.';
    default:
      return 'A new step in the journey was recorded.';
  }
}

function titleForPost(post: CommunityPost, fallback: string): string {
  if (!post.generated) return post.title || fallback;
  switch (post.type) {
    case 'weight_loss': return 'A lighter step';
    case 'streak': return 'Consistency milestone';
    case 'goal_milestone':
    case 'milestone': return 'Goal milestone';
    case 'photo': return 'Progress snapshot';
    default: return 'New progress';
  }
}

/** A single calm, text-first activity card used by the community feed. */
export function ProgressPost({
  post,
  author,
  activeReaction,
  userReaction,
  onReact,
  onReaction,
}: ProgressPostProps) {
  const meta = typeMeta[post.type] || typeMeta.custom;
  const Icon = meta.icon;
  const displayName = author?.displayName || post.authorName || 'Healthy member';
  const avatar = author?.initials || post.authorInitials || initials(displayName);
  const copy = copyForPost(post);
  const metric = metricText(post);
  const reactionHandler = onReact || onReaction;

  return (
    <article className="progress-post surface" dir="ltr" aria-labelledby={`post-title-${post.id}`}>
      <header className="progress-post-head">
        <div className="post-author">
          {author?.avatarUrl ? (
            <img className="post-avatar" src={author.avatarUrl} alt="" />
          ) : (
            <span className="post-avatar" aria-hidden="true">{avatar}</span>
          )}
          <div className="post-author-copy">
            <strong>{displayName}</strong>
            <span>
              <time dateTime={post.createdAt}>{displayDate(post.date || post.createdAt)}</time>
              <span aria-hidden="true"> · </span>{meta.label}
            </span>
          </div>
        </div>
        {post.generated ? (
          <span className="system-post-mark" title="This activity was created automatically by Healthy">
            <CircleCheck size={13} aria-hidden="true" /> Healthy system
          </span>
        ) : null}
      </header>

      <div className="progress-post-body">
        <div className="post-type-icon" aria-hidden="true"><Icon size={18} /></div>
        <div className="post-copy-wrap">
          <h2 id={`post-title-${post.id}`}>{titleForPost(post, meta.label)}</h2>
          <p>{copy}</p>
        </div>
        {metric ? <div className="post-metric" aria-label={metric}><strong>{metric.split(' ')[0]}</strong><span>{metric.split(' ').slice(1).join(' ')}</span></div> : null}
      </div>

      <footer className="progress-post-foot">
        <ReactionBar
          post={post}
          activeReaction={activeReaction}
          userReaction={userReaction}
          onReact={reactionHandler}
        />
        {post.type === 'weight_loss' ? <span className="post-foot-note"><Flame size={14} aria-hidden="true" /> Keep going</span> : null}
      </footer>

      <style jsx>{`
        .progress-post {
          overflow: hidden;
          padding: 20px 22px 14px;
          border-radius: var(--radius-md, 10px);
        }
        .progress-post-head,
        .progress-post-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .post-author { min-width: 0; display: flex; align-items: center; gap: 10px; }
        .post-avatar {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border: 1px solid var(--line-strong, #626262);
          border-radius: 50%;
          background: var(--surface-2, #1b1b1b);
          color: var(--ink, #f7f7f7);
          font-family: 'DM Sans', sans-serif;
          font-size: 18px;
          object-fit: cover;
        }
        .post-author-copy { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .post-author-copy strong { overflow: hidden; color: var(--ink, #f7f7f7); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
        .post-author-copy span { color: var(--ink-faint, #999999); font-size: 10px; }
        .system-post-mark { display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto; color: var(--ink-faint, #999999); font-size: 10px; white-space: nowrap; }
        .system-post-mark svg { color: var(--success, #e2e2e2); }
        .progress-post-body { display: flex; align-items: flex-start; gap: 12px; margin-top: 21px; }
        .post-type-icon { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid var(--line, #333333); color: var(--accent, #f7f7f7); }
        .post-copy-wrap { min-width: 0; flex: 1; }
        .post-copy-wrap h2 { margin: 0; color: var(--ink, #f7f7f7); font-family: 'Space Grotesk', sans-serif; font-size: 21px; line-height: 1; }
        .post-copy-wrap p { margin: 7px 0 0; color: var(--ink-soft, #c5c5c5); font-size: 13px; line-height: 1.8; }
        .post-metric { min-width: 64px; display: flex; flex-direction: column; align-items: flex-end; padding-inline-start: 7px; border-inline-start: 1px solid var(--line, #333333); direction: ltr; }
        .post-metric strong { color: var(--accent, #f7f7f7); font-family: 'Space Grotesk', sans-serif; font-size: 26px; line-height: .9; direction: ltr; }
        .post-metric span { margin-top: 5px; color: var(--ink-faint, #999999); font-size: 9px; text-align: end; }
        .progress-post-foot { margin-top: 19px; padding-top: 12px; border-top: 1px solid var(--line, #333333); }
        .post-foot-note { display: inline-flex; align-items: center; gap: 4px; color: var(--ink-faint, #999999); font-size: 10px; white-space: nowrap; }
        .post-foot-note svg { color: var(--accent, #f7f7f7); }
        @media (max-width: 440px) {
          .progress-post { padding-inline: 15px; }
          .system-post-mark { font-size: 9px; }
          .post-metric { min-width: 52px; }
          .post-metric strong { font-size: 22px; }
        }
      `}</style>
    </article>
  );
}

export default ProgressPost;
