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

  const panel = (
    <MessagesPanel key={`${c}-${application}`} initialConversationId={c} initialApplicationId={application} />
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
    <AppLayout title="Messages" showSearch={false}>
      {panel}
    </AppLayout>
  );
}