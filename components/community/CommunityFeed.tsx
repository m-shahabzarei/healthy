'use client';

import Link from 'next/link';
import { ArrowRight, Filter, HeartHandshake, Users } from 'lucide-react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { getHostedServerState, getHostedState, subscribeHosted, toggleHostedReaction } from '@/lib/hosted-store';
import { getReactionForUser } from '@/lib/selectors';
import type { CommunityPost } from '@/lib/types';
import ProgressPost from './ProgressPost';
import type { CommunityReaction } from './ReactionBar';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatNumber, translateError } from '@/lib/i18n';

export type CommunityFilter = 'all' | 'weight_loss' | 'records';

const FILTERS: ReadonlyArray<{ key: CommunityFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'weight_loss', label: 'Weight loss' },
  { key: 'records', label: 'Records' },
];

const reactionCopy: Record<CommunityReaction, { on: string; off: string }> = {
  encourage: { on: 'Encouragement added.', off: 'Encouragement removed.' },
  celebrate: { on: 'Celebration added.', off: 'Celebration removed.' },
  fire: { on: 'Fire reaction added.', off: 'Fire reaction removed.' },
};

function sortPosts(posts: CommunityPost[]): CommunityPost[] {
  return posts.slice().sort((a, b) => {
    const date = b.date.localeCompare(a.date);
    return date || b.createdAt.localeCompare(a.createdAt);
  });
}

function matchesFilter(post: CommunityPost, filter: CommunityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'weight_loss') return post.type === 'weight_loss';
  return post.type === 'streak' || post.type === 'goal_milestone' || post.type === 'milestone';
}

function filterEmptyCopy(filter: CommunityFilter): string {
  switch (filter) {
    case 'weight_loss':
      return 'When your latest check-in is lighter, that small win will appear here.';
    case 'records':
      return 'A seven-day streak or a goal milestone will show up here.';
    default:
      return 'No activity yet. Log your first check-in from the dashboard.';
  }
}

/** Community activity stream backed entirely by persisted Supabase posts. */
export function CommunityFeed() {
  const { locale, t } = useLanguage();
  const { snapshot } = useSyncExternalStore(subscribeHosted, getHostedState, getHostedServerState);
  const [filter, setFilter] = useState<CommunityFilter>('all');
  const [announcement, setAnnouncement] = useState('');
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);

  const posts = useMemo(() => sortPosts(snapshot.posts), [snapshot.posts]);
  const visiblePosts = useMemo(
    () => posts.filter((post) => matchesFilter(post, filter)),
    [filter, posts],
  );

  async function handleReact(post: CommunityPost, reaction: CommunityReaction) {
    if (pendingPostId) return;
    setPendingPostId(post.id);
    setAnnouncement('Saving your reaction…');
    try {
      const result = await toggleHostedReaction(post.id, reaction);
      setAnnouncement(result.active ? reactionCopy[reaction].on : reactionCopy[reaction].off);
    } catch (reactionError) {
      setAnnouncement(reactionError instanceof Error ? reactionError.message : 'Reaction could not be saved. Try again.');
    } finally {
      setPendingPostId(null);
    }
  }

  return (
    <div className="community-page app-container">
      <header className="community-header">
        <h1 className="sr-only">{t('Community progress feed')}</h1>
        <div className="community-count" aria-label={t('{count} activities in the feed', { count: formatNumber(locale, posts.length) })}>
          <Users size={18} aria-hidden="true" />
          <strong>{formatNumber(locale, posts.length)}</strong>
          <span>{t('activities')}</span>
        </div>
      </header>

      <section className="community-note surface-muted" aria-label={t('Feed guidance')}>
        <span className="community-note-icon" aria-hidden="true"><HeartHandshake size={20} /></span>
        <div><strong>{t('No comparisons here.')}</strong><p>{t('Every check-in is proof that you kept going. Leave a simple reaction when someone needs support.')}</p></div>
      </section>

      <div className="community-toolbar">
        <div className="community-filters" role="group" aria-label={t('Filter activities')}>
          <Filter size={15} aria-hidden="true" />
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`community-filter ${filter === item.key ? 'active' : ''}`}
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
        <span className="community-result-count">{t('{count} items', { count: formatNumber(locale, visiblePosts.length) })}</span>
      </div>

      <p className="community-announcement" role="status" aria-live="polite">{announcement ? (announcement.includes('could not') || announcement.includes('failed') ? translateError(locale, announcement) : t(announcement)) : ''}</p>

      {visiblePosts.length ? (
        <section className="community-list" aria-label={t('Community progress feed')}>
          {visiblePosts.map((post) => {
            const active = getReactionForUser(post.id, snapshot.currentUser?.id, snapshot);
            const pending = pendingPostId === post.id;
            return (
              <fieldset
                key={post.id}
                className="community-post-fieldset"
                disabled={pending}
                aria-busy={pending}
              >
                <ProgressPost
                  post={post}
                  activeReaction={active?.type === 'encourage' || active?.type === 'celebrate' || active?.type === 'fire' ? active.type : null}
                  onReact={(reaction) => void handleReact(post, reaction)}
                />
              </fieldset>
            );
          })}
        </section>
      ) : (
        <section className="community-empty empty-state">
          <strong>{t('Nothing to show yet.')}</strong>
          <p>{t(filterEmptyCopy(filter))}</p>
          <Link href="/dashboard" className="button button-ghost"><ArrowRight size={16} aria-hidden="true" /> {t("Log today's weight")}</Link>
        </section>
      )}

      <style jsx global>{`
        .community-page { max-width: 900px; }
        .community-header { display: flex; justify-content: flex-end; margin-bottom: 28px; }
        .community-count { min-width: 105px; display: grid; grid-template-columns: auto 1fr; align-items: center; column-gap: 8px; row-gap: 0; padding: 12px 14px; border: 1px solid var(--line, #333333); color: var(--ink-faint, #999999); }
        .community-count svg { grid-row: span 2; color: var(--accent, #f7f7f7); }
        .community-count strong { color: var(--ink, #f7f7f7); font-family: 'Space Grotesk', sans-serif; font-size: 27px; line-height: .9; }
        .community-count span { font-size: 10px; }
        .community-note { display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px; margin-bottom: 25px; }
        .community-note-icon { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid var(--line-strong, #626262); color: var(--accent, #f7f7f7); }
        .community-note strong { display: block; font-family: 'Space Grotesk', sans-serif; font-size: 21px; font-weight: 600; line-height: 1.1; }
        .community-note p { margin: 3px 0 0; color: var(--ink-soft, #c5c5c5); font-size: 12px; line-height: 1.8; }
        .community-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
        .community-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
        .community-filters > svg { margin-inline-end: 2px; color: var(--ink-faint); }
        .community-filter { min-height: 44px; padding: 6px 12px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--ink-faint, #999999); font: inherit; font-size: 11px; transition: color .2s var(--ease), border-color .2s var(--ease), background .2s var(--ease); }
        .community-filter:hover { color: var(--ink, #f7f7f7); border-color: var(--line-strong, #626262); }
        .community-filter.active { border-color: var(--line-strong, #626262); background: var(--surface, #121212); color: var(--ink, #f7f7f7); }
        .community-result-count { color: var(--ink-faint, #999999); font-size: 10px; white-space: nowrap; }
        .community-announcement { min-height: 19px; margin: 0 0 10px; color: var(--success, #e2e2e2); font-size: 11px; }
        .community-list { display: grid; gap: 12px; }
        .community-post-fieldset { min-width: 0; margin: 0; padding: 0; border: 0; transition: opacity .2s var(--ease, ease); }
        .community-post-fieldset[disabled] { opacity: .62; }
        .community-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 42px 20px; }
        .community-empty .button { margin-top: 12px; }
        @media (max-width: 600px) {
          .community-note { padding-inline: 14px; }
          .community-toolbar { align-items: flex-start; flex-direction: column; gap: 8px; }
          .community-result-count { align-self: flex-end; margin-top: -5px; }
        }
      `}</style>
    </div>
  );
}

export default CommunityFeed;
