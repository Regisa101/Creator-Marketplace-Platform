import { useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Building2,
  FileText,
  Users,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { api } from '../api/client';

interface AdminOverview {
  users: {
    creators: number;
    businesses: number;
    total?: number;
  };

  campaigns: {
    open: number;
    closed: number;
    completed: number;
    total?: number;
  };

  applications: {
    total: number;
    pending: number;
    selected: number;
    rejected?: number;
  };

  revenue: {
    total: number;
    this_month: number;
    transactions: number;
  };
}

interface AdminPayment {
  id: number;
  campaign_title?: string | null;
  business_name?: string | null;
  creator_name?: string | null;
  amount: number;
  status: string;
  created_at?: string | null;
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const [data, setData] =
    useState<AdminOverview | null>(null);

  const [payments, setPayments] =
    useState<AdminPayment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const [
          overviewResponse,
          paymentsResponse,
        ] = await Promise.all([
          api.get<AdminOverview>(
            '/admin/overview'
          ),

          api.get<AdminPayment[]>(
            '/admin/payments'
          ),
        ]);

        if (cancelled) {
          return;
        }

        setData(
          overviewResponse.data
        );

        setPayments(
          Array.isArray(
            paymentsResponse.data
          )
            ? paymentsResponse.data
            : []
        );
      } catch (err: any) {
        if (cancelled) {
          return;
        }

        setError(
          err?.response?.data?.detail ||
          'Could not load admin dashboard.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <AppLayout
      title="Admin dashboard"
      subtitle="Track creators, brands, campaigns, applications and Creatorhub revenue."
      showSearch={false}
      showNotifications
    >
      <style>{`
        .admin-page {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 0 50px;
        }

        .admin-error {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #f8eeee;
          color: #a52b2b;
          font: 500 12px Poppins, sans-serif;
        }

        .admin-loading {
          padding: 70px 20px;
          text-align: center;
          color: #777;
          font: 500 12px Poppins, sans-serif;
        }

        .admin-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .admin-stat,
        .admin-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 14px;
        }

        .admin-stat {
          padding: 17px;
        }

        .admin-icon {
          width: 31px;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #f3f3f3;
          margin-bottom: 12px;
        }

        .admin-label {
          color: #888;
          font: 500 10px Poppins, sans-serif;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .admin-value {
          margin-top: 3px;
          color: #111;
          font: 700 24px Poppins, sans-serif;
        }

        .admin-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 14px;
        }

        .admin-card {
          padding: 18px;
        }

        .admin-card h3 {
          margin: 0 0 14px;
          color: #111;
          font: 700 14px Poppins, sans-serif;
        }

        .admin-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 0;
          border-top: 1px solid #eee;
          color: #555;
          font: 500 12px Poppins, sans-serif;
        }

        .admin-line:first-of-type {
          border-top: 0;
        }

        .admin-line strong {
          color: #111;
        }

        .admin-revenue {
          color: #111;
          font: 800 28px Poppins, sans-serif;
        }

        .admin-sub {
          margin-top: 5px;
          color: #888;
          font: 400 11px Poppins, sans-serif;
        }

        .admin-table-card {
          margin-top: 14px;
        }

        .admin-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-table th,
        .admin-table td {
          padding: 10px 7px;
          text-align: left;
          border-bottom: 1px solid #eee;
          white-space: nowrap;
          font: 500 10.5px Poppins, sans-serif;
        }

        .admin-table th {
          color: #888;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .admin-empty {
          padding: 20px 7px !important;
          color: #888;
        }

        @media (max-width: 900px) {
          .admin-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .admin-columns {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .admin-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="admin-page">

        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}

        {loading && (
          <div className="admin-loading">
            Loading admin dashboard…
          </div>
        )}

        {!loading && data && (
          <>
            {/* =========================
                STATISTICS
            ========================== */}

            <div className="admin-stats">

              <div className="admin-stat">
                <div className="admin-icon">
                  <Users size={16} />
                </div>

                <div className="admin-label">
                  Creators
                </div>

                <div className="admin-value">
                  {data.users.creators}
                </div>
              </div>

              <div className="admin-stat">
                <div className="admin-icon">
                  <Building2 size={16} />
                </div>

                <div className="admin-label">
                  Brands
                </div>

                <div className="admin-value">
                  {data.users.businesses}
                </div>
              </div>

              <div className="admin-stat">
                <div className="admin-icon">
                  <FileText size={16} />
                </div>

                <div className="admin-label">
                  Applications
                </div>

                <div className="admin-value">
                  {data.applications.total}
                </div>
              </div>

              <div className="admin-stat">
                <div className="admin-icon">
                  <BadgeDollarSign size={16} />
                </div>

                <div className="admin-label">
                  Platform revenue
                </div>

                <div className="admin-value">
                  NPR{' '}
                  {Number(
                    data.revenue.total
                  ).toLocaleString('en-NP')}
                </div>
              </div>

            </div>


            {/* =========================
                ACTIVITY + REVENUE
            ========================== */}

            <div className="admin-columns">

              <section className="admin-card">

                <h3>
                  Platform activity
                </h3>

                <div className="admin-line">
                  <span>
                    Open campaigns
                  </span>

                  <strong>
                    {data.campaigns.open}
                  </strong>
                </div>

                <div className="admin-line">
                  <span>
                    Closed campaigns
                  </span>

                  <strong>
                    {data.campaigns.closed}
                  </strong>
                </div>

                <div className="admin-line">
                  <span>
                    Completed campaigns
                  </span>

                  <strong>
                    {data.campaigns.completed}
                  </strong>
                </div>

                <div className="admin-line">
                  <span>
                    Pending applications
                  </span>

                  <strong>
                    {data.applications.pending}
                  </strong>
                </div>

                <div className="admin-line">
                  <span>
                    Selected creators
                  </span>

                  <strong>
                    {data.applications.selected}
                  </strong>
                </div>

              </section>


              <section className="admin-card">

                <h3>
                  Revenue
                </h3>

                <div className="admin-revenue">
                  NPR{' '}
                  {Number(
                    data.revenue.total
                  ).toLocaleString('en-NP')}
                </div>

                <div className="admin-sub">
                  This month: NPR{' '}
                  {Number(
                    data.revenue.this_month
                  ).toLocaleString('en-NP')}
                </div>

                <div
                  className="admin-line"
                  style={{
                    marginTop: 12,
                  }}
                >
                  <span>
                    Successful transactions
                  </span>

                  <strong>
                    {data.revenue.transactions}
                  </strong>
                </div>

              </section>

            </div>


            {/* =========================
                PAYMENTS
            ========================== */}

            <section
              className="admin-card admin-table-card"
            >

              <h3>
                Recent platform payments
              </h3>

              <div className="admin-table-wrap">

                <table className="admin-table">

                  <thead>
                    <tr>
                      <th>
                        Campaign
                      </th>

                      <th>
                        Brand
                      </th>

                      <th>
                        Creator
                      </th>

                      <th>
                        Amount
                      </th>

                      <th>
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {payments
                      .slice(0, 20)
                      .map((payment) => (
                        <tr
                          key={payment.id}
                        >
                          <td>
                            {
                              payment.campaign_title ||
                              '—'
                            }
                          </td>

                          <td>
                            {
                              payment.business_name ||
                              '—'
                            }
                          </td>

                          <td>
                            {
                              payment.creator_name ||
                              '—'
                            }
                          </td>

                          <td>
                            NPR{' '}
                            {Number(
                              payment.amount
                            ).toLocaleString(
                              'en-NP'
                            )}
                          </td>

                          <td>
                            {payment.status}
                          </td>
                        </tr>
                      ))}

                    {payments.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="admin-empty"
                        >
                          No payments yet.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          </>
        )}

      </div>
    </AppLayout>
  );
}