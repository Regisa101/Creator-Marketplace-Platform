import { useEffect, useState } from 'react';
import { FileSignature, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { getContracts, type Contract } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_payment: 'Awaiting payment',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'active' || status === 'completed') return <CheckCircle2 size={14} />;
  if (status === 'pending_payment') return <Clock3 size={14} />;
  if (status === 'cancelled') return <XCircle size={14} />;
  return <FileSignature size={14} />;
}

export function ContractHistory() {
  const { user } = useAuth();
  const isCreator = user?.role === 'creator';
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try { setContracts(await getContracts()); }
      catch (err: any) { setError(err?.response?.data?.detail || 'Could not load your history.'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <AppLayout
      title={isCreator ? 'Contract History' : 'Collab History'}
      subtitle={isCreator ? 'Every contract you have been offered, activated, or completed.' : 'Every collaboration you have finalized with a creator.'}
      showSearch={false}
    >
      <style>{`
        .ch-hist-wrap{max-width:920px;margin:0 auto;padding-bottom:50px}
        .ch-hist-empty{padding:60px 20px;text-align:center;color:#777;font:500 13px Poppins,sans-serif}
        .ch-hist-error{padding:11px 13px;background:#f8eeee;color:#ad2929;border-radius:9px;font:500 12px Poppins,sans-serif;margin-bottom:14px}
        .ch-hist-card{background:#fff;border:1px solid #e5e5e5;border-radius:14px;padding:18px;margin-bottom:12px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
        .ch-hist-title{font:700 14px Poppins,sans-serif;color:#111}
        .ch-hist-sub{font:400 11px Poppins,sans-serif;color:#888;margin-top:3px}
        .ch-hist-amt{text-align:right}
        .ch-hist-amt strong{display:block;font:700 15px Poppins,sans-serif}
        .ch-hist-fee{font:500 11px Poppins,sans-serif;color:#888;margin-top:2px}
        .ch-hist-status{display:inline-flex;align-items:center;gap:5px;margin-top:8px;font:600 10px Poppins,sans-serif;text-transform:uppercase;letter-spacing:.05em;padding:5px 9px;border-radius:99px;background:#f3f3f3;color:#555}
        .ch-hist-status.active{background:#eaf6ee;color:#1c7a3c}
        .ch-hist-status.pending_payment{background:#fdf3e3;color:#9a6a10}
        .ch-hist-ref{font:400 10px Poppins,sans-serif;color:#999;margin-top:6px}
        @media(max-width:600px){.ch-hist-card{flex-direction:column}.ch-hist-amt{text-align:left}}
      `}</style>
      <div className="ch-hist-wrap">
        {error && <div className="ch-hist-error">{error}</div>}
        {loading && <div className="ch-hist-empty">Loading…</div>}
        {!loading && contracts.length === 0 && <div className="ch-hist-empty">No contracts yet.</div>}
        {!loading && contracts.map(c => (
          <div className="ch-hist-card" key={c.id}>
            <div>
              <div className="ch-hist-title">{c.campaign_title || `Campaign #${c.campaign_id}`}</div>
              <div className="ch-hist-sub">{isCreator ? (c.business_name || 'Business') : (c.creator_name || 'Creator')}</div>
              <span className={`ch-hist-status ${c.status}`}><StatusIcon status={c.status} /> {STATUS_LABEL[c.status] || c.status}</span>
              {c.payment_reference && <div className="ch-hist-ref">Receipt {c.payment_reference}</div>}
            </div>
            <div className="ch-hist-amt">
              <strong>NPR {Number(c.total_value || 0).toLocaleString()}</strong>
              {!isCreator && <div className="ch-hist-fee">Fee: NPR {Number(c.platform_fee_amount || 0).toLocaleString()}</div>}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

export default ContractHistory;