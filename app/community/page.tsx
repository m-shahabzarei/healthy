import { AppShell } from '@/components/layout/AppShell';
import { CommunityFeed } from '@/components/community/CommunityFeed';

export default function CommunityPage() {
  return (
    <AppShell active="community">
      <CommunityFeed />
    </AppShell>
  );
}
