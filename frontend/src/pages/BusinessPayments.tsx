import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getContracts, type Contract } from '../api/client';
import { AppLayout } from '../components/AppLayout';

type Filter = 'all' | 'paid' | 'pending';

const npr = (value: number) => `NPR ${Math.round(value).toLocaleString('en-IN')}`;

const METHOD_LABEL: Record<string, string> = {
  khalti: 'Khalti',
  wallet: 'Wallet',
  card: 'Card',
  demo: 'Demo',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** One line of the payment record, worked out from a contract. */
function toRow(c: Contract) {
  const compensation = Number(c.total_value ?? c.agreed_rate ?? 0);
  const fee = Number(c.platform_fee_amount ?? 0);
  const paid = Boolean(c.fee_paid);
  return {
    id: c.id,
    date: c.fee_paid_at || c.created_at,
    campaign: c.campaign_title || 'Campaign',
    creator: c.creator_name || 'Creator',
    compensation,
    fee,
    paid,
    cancelled: c.status === 'cancelled',
    method: c.payment_method ? METHOD_LABEL[c.payment_method] ?? c.payment_method : '—',
    reference: c.payment_reference || '—',
  };
}

export default function BusinessPayments() {
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let alive = true;
    getContracts()
      .then((data) => alive && setContracts(data))
      .catch(() => alive && setError('Could not load your payments. Please try again.'));
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      (contracts || [])
        .filter((c) => c.status !== 'draft')
        .map(toRow)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [contracts],
  );

  const live = rows.filter((r) => !r.cancelled);
  const feesPaid = live.filter((r) => r.paid).reduce((sum, r) => sum + r.fee, 0);
  const feesPending = live.filter((r) => !r.paid).reduce((sum, r) => sum + r.fee, 0);
  const compensation = live.reduce((sum, r) => sum + r.compensation, 0);

  const shown = rows.filter((r) =>
    filter === 'paid' ? r.paid : filter === 'pending' ? !r.paid && !r.cancelled : true,
  );

  const downloadCsv = () => {
    const head = ['Date', 'Campaign', 'Creator', 'Creator compensation (NPR)', 'CreatorHub fee (NPR)', 'Status', 'Method', 'Reference'];
    const lines = shown.map((r) =>
      [
        formatDate(r.date),
        r.campaign,
        r.creator,
        r.compensation,
        r.fee,
        r.cancelled ? 'Cancelled' : r.paid ? 'Paid' : 'Pending',
        r.method,
        r.reference,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'creatorhub-payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Payments" subtitle="A record of every CreatorHub fee you have paid." showNotifications>
      <style>{`
        .bp-page{max-width:1120px;padding:18px 24px 54px;font-family:'Poppins',sans-serif;color:#17151d}
        .bp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
        .bp-stat{border:1px solid #e6e3dd;border-radius:14px;padding:16px 18px;background:#fff}
        .bp-stat small{display:block;color:#888;font-size:12px}
        .bp-stat strong{display:block;font-size:21px;font-weight:600;margin:4px 0 2px}
        .bp-stat span{font-size:11.5px;color:#999}
        .bp-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
        .bp-pills{display:flex;gap:8px}
        .bp-pill{border:1px solid #ddd;background:#fff;border-radius:999px;padding:7px 15px;font:500 12.5px 'Poppins',sans-serif;cursor:pointer;color:#444}
        .bp-pill.on{background:#197935;border-color:#197935;color:#fff}
        .bp-csv{border:1px solid #ddd;background:#fff;border-radius:10px;padding:8px 16px;font:500 12.5px 'Poppins',sans-serif;cursor:pointer}
        .bp-csv:hover{border-color:#197935;color:#197935}
        .bp-card{border:1px solid #e6e3dd;border-radius:14px;background:#fff;overflow:hidden}
        .bp-scroll{overflow-x:auto}
        .bp-table{width:100%;border-collapse:collapse;font-size:13px}
        .bp-table th{text-align:left;font-weight:500;font-size:11.5px;color:#888;padding:12px 16px;border-bottom:1px solid #eeeae3;white-space:nowrap}
        .bp-table td{padding:14px 16px;border-bottom:1px solid #f3f0ea;white-space:nowrap}
        .bp-table tr:last-child td{border-bottom:0}
        .bp-table .num{text-align:right}
        .bp-badge{display:inline-block;padding:3px 11px;border-radius:999px;font-size:11.5px;font-weight:500}
        .bp-paid{background:#e8f5ec;color:#14602a}
        .bp-pending{background:#fff4e0;color:#9a6200}
        .bp-cancelled{background:#f1f1f1;color:#777}
        .bp-note{margin:14px 2px 0;font-size:12px;color:#888;line-height:1.6}
        .bp-empty{padding:46px 20px;text-align:center;color:#888;font-size:13.5px}
        .bp-error{padding:12px 14px;border:1px solid #ead7d7;background:#fff8f8;color:#9b4545;border-radius:10px;font-size:13px;margin-bottom:14px}
        @media(max-width:860px){.bp-stats{grid-template-columns:repeat(2,1fr)}.bp-page{padding:14px 12px 40px}}
      `}</style>

      <div className="bp-page">
        {error && <div className="bp-error">{error}</div>}

        <div className="bp-stats">
          <div className="bp-stat"><small>Fees paid</small><strong>{npr(feesPaid)}</strong><span>Paid to CreatorHub</span></div>
          <div className="bp-stat"><small>Fees pending</small><strong>{npr(feesPending)}</strong><span>Due to activate contracts</span></div>
          <div className="bp-stat"><small>Creator compensation</small><strong>{npr(compensation)}</strong><span>Agreed, paid to creators directly</span></div>
          <div className="bp-stat"><small>Contracts</small><strong>{live.length}</strong><span>Creators hired</span></div>
        </div>

        <div className="bp-bar">
          <div className="bp-pills">
            {(['all', 'paid', 'pending'] as Filter[]).map((f) => (
              <button key={f} type="button" className={`bp-pill${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Pending'}
              </button>
            ))}
          </div>
          <button type="button" className="bp-csv" onClick={downloadCsv} disabled={shown.length === 0}>
            Download CSV
          </button>
        </div>

        <div className="bp-card">
          {!contracts && !error ? (
            <div className="bp-empty">Loading payments…</div>
          ) : shown.length === 0 ? (
            <div className="bp-empty">
              No payments here yet. When you hire a creator and pay the CreatorHub fee, it will be recorded here.
            </div>
          ) : (
            <div className="bp-scroll">
              <table className="bp-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Campaign</th><th>Creator</th>
                    <th className="num">Creator compensation</th><th className="num">CreatorHub fee</th>
                    <th>Method</th><th>Reference</th><th>Status</th><th />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.date)}</td>
                      <td>{r.campaign}</td>
                      <td>{r.creator}</td>
                      <td className="num">{npr(r.compensation)}</td>
                      <td className="num">{npr(r.fee)}</td>
                      <td>{r.method}</td>
                      <td>{r.reference}</td>
                      <td>
                        <span className={`bp-badge ${r.cancelled ? 'bp-cancelled' : r.paid ? 'bp-paid' : 'bp-pending'}`}>
                          {r.cancelled ? 'Cancelled' : r.paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td><Link to={`/contracts/${r.id}`}>View contract</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="bp-note">
          CreatorHub only charges its service fee. The creator&apos;s compensation is agreed in the contract and paid
          directly between you and the creator, so it is listed here for your records but not processed by CreatorHub.
        </p>
      </div>
    </AppLayout>
  );
}