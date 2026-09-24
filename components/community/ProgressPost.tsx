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
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatDate, formatNumber, type Locale } from '@/lib/i18n';

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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.[0] || '?').toUpperCase();
}

function metricText(post: CommunityPost, locale: Locale, t: (key: string, values?: Record<string, string | number>) => string): { value: string; label: string } | null {
  if (!Number.isFinite(post.metricValue)) return null;
  const value = formatNumber(locale, Math.abs(post.metricValue!), { maximumFractionDigits: 1 });
  const label = post.type === 'weight_loss' || post.type === 'goal_milestone'
    ? 'kg lost'
    : post.type === 'streak'
      ? 'day streak'
      : post.type === 'photo'
        ? 'progress photo'
        : post.metricLabel || '';
  return { value, label: t(label) };
}

function copyForPost(post: CommunityPost, locale: Locale, t: (key: string, values?: Record<string, string | number>) => string): string {
  if (!post.generated) return post.copy || post.body || post.text || t('A new step in the journey was recorded.');
  const value = Number.isFinite(post.metricValue)
    ? formatNumber(locale, Math.abs(post.metricValue!), { maximumFractionDigits: 1 })
    : '';
  switch (post.type) {
    case 'weight_loss':
      return value ? t('{value} kg lighter since the previous check-in. Slow and steady.', { value }) : t('A lighter check-in. Slow and steady.');
    case 'streak':
      return value ? t('{value} days of logging complete. Consistency beats perfection.', { value }) : t('A consistency milestone reached.');
    case 'goal_milestone':
    case 'milestone':
      return value ? t('{value} kg closer to the goal. Small steps add up.', { value }) : t('A meaningful goal milestone reached.');
    case 'photo':
      return t('A new progress photo was added to the journey.');
    default:
      return t('A new step in the journey was recorded.');
  }
}

function titleForPost(post: CommunityPost, fallback: string, t: (key: string) => string): string {
  if (!post.generated) return post.title || t(fallback);
  switch (post.type) {
    case 'weight_loss': return t('A lighter step');
    case 'streak': return t('Consistency milestone');
    case 'goal_milestone':
    case 'milestone': return t('Goal milestone');
    case 'photo': return t('Progress snapshot');
    default: return t('New progress');
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
  const { locale, t } = useLanguage();
  const meta = typeMeta[post.type] || typeMeta.custom;
  const Icon = meta.icon;
  const displayName = author?.displayName || post.authorName || t('Healthy member');
  const avatar = author?.initials || post.authorInitials || initials(displayName);
  const copy = copyForPost(post, locale, t);
  const metric = metricText(post, locale, t);
  const reactionHandler = onReact || onReaction;

  return (
    <article className="progress-post surface" aria-labelledby={`post-title-${post.id}`}>
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
              <time dateTime={post.createdAt}>{formatDate(locale, post.date || post.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
              <span aria-hidden="true"> · </span>{t(meta.label)}
            </span>
          </div>
        </div>
        {post.generated ? (
          <span className="system-post-mark" title={t('This activity was created automatically by Healthy')}>
            <CircleCheck size={13} aria-hidden="true" /> {t('Healthy system')}
          </span>
        ) : null}
      </header>

      <div className="progress-post-body">
        <div className="post-type-icon" aria-hidden="true"><Icon size={18} /></div>
        <div className="post-copy-wrap">
          <h2 id={`post-title-${post.id}`}>{titleForPost(post, meta.label, t)}</h2>
          <p>{copy}</p>
        </div>
        {metric ? <div className="post-metric" aria-label={`${metric.value} ${metric.label}`}><strong>{metric.value}</strong><span>{metric.label}</span></div> : null}
      </div>

      <footer className="progress-post-foot">
        <ReactionBar
          post={post}
          activeReaction={activeReaction}
          userReaction={userReaction}
          onReact={reactionHandler}
        />
        {post.type === 'weight_loss' ? <span className="post-foot-note"><Flame size={14} aria-hidden="true" /> {t('Keep going')}</span> : null}
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
