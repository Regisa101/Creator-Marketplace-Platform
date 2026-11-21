import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { PublicNavbar } from '../components/PublicNavbar';
import { MessagesPanel } from '../components/MessagesPanel';
import { useAuth } from '../context/AuthContext';

/**
 * Full inbox. Brands see it inside the dashboard layout; creators see it with
 * the landing navbar (same split as the Applications page).
 *   /messages?c=<conversationId>        open a conversation
 *   /messages?application=<id>          open / start the conversation for an application
 */
export function Messages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const c = Number(params.get('c')) || null;
  const application = Number(params.get('application')) || null;
  // Brands search from the dashboard header; the panel just filters by this text.
  const [query, setQuery] = useState('');
  const isCreator = user?.role === 'creator';

  const panel = (
    <MessagesPanel
      key={`${c}-${application}`}
      initialConversationId={c}
      initialApplicationId={application}
      searchQuery={isCreator ? undefined : query}
      onSearchChange={isCreator ? undefined : setQuery}
      showTitle={isCreator} // the brand's dashboard header already says "Messages"
    />
  );

  if (user?.role === 'creator') {
    return (
      <>
        <PublicNavbar />
        <main style={{ maxWidth: 1040, margin: '0 auto', padding: '96px 16px 32px' }}>{panel}</main>
      </>
    );
  }

  return (
    <AppLayout
      title="Messages"
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search creators, campaigns or messages"
    >
      {/* The dashboard header has 24px side padding but the page body has none, so the page adds it. */}
      <div style={{ padding: '0 24px 24px', ['--dm-h' as string]: 'calc(100vh - 210px)' }}>{panel}</div>
    </AppLayout>
  );
}