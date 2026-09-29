import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Search,
  XCircle,
  FileText,
  UserRound,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  CircleDollarSign,
  PlayCircle,
  X,
  Eye,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';

import {
  completeContract,
  getContracts,
  getPublicBusinessProfile,
  getCreatorProfile,
  type Contract,
} from '../api/client';

import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';

type FilterType =
  | 'all'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'pending_payment';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_payment: 'Pending Payment',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Soft pastel palette used for the business icon squares — picked
// deterministically per business name so the same business always
// gets the same color.
const BIZ_PALETTE = [
  { bg: '#FDECEC', fg: '#D6605F' },
  { bg: '#FCEFF6', fg: '#D6608F' },
  { bg: '#E9F7EF', fg: '#3AA76D' },
  { bg: '#EAF1FE', fg: '#4C7EDB' },
  { bg: '#FFF6E5', fg: '#C98A2E' },
  { bg: '#F3EEFE', fg: '#8C6FE0' },
];

function bizPalette(name?: string | null) {
  const str = name || 'Business';
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return BIZ_PALETTE[hash % BIZ_PALETTE.length];
}

function money(value?: number | null) {
  return `NPR ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Not set';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusLabel(status: string) {
  return (
    STATUS_LABEL[status] ||
    status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function StatusIcon({ status, size = 15 }: { status: string; size?: number }) {
  if (status === 'active') return <PlayCircle size={size} />;
  if (status === 'completed') return <CheckCircle2 size={size} />;
  if (status === 'cancelled') return <XCircle size={size} />;
  if (status === 'pending_payment') return <Clock3 size={size} />;
  return <FileText size={size} />;
}

function getCampaignImage(contract: Contract) {
  return contract.evidence_snapshot?.campaign?.hero_image || '';
}

// Best-effort category/niche tag for the business chip — different
// backends may surface this under different keys, so we fall back
// gracefully rather than requiring a specific field to exist.
function getCategoryTag(contract: Contract) {
  const anyContract = contract as any;
  return (
    anyContract.category ||
    anyContract.campaign_category ||
    anyContract.evidence_snapshot?.campaign?.category ||
    anyContract.evidence_snapshot?.campaign?.niche ||
    contract.engagement_type ||
    ''
  );
}

export function ContractHistory() {
  const { user } = useAuth();

  const isCreator = user?.role === 'creator';
  const isBusiness = user?.role === 'business';

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // The contract whose details are shown in the popup (null = closed)
  const [detailContract, setDetailContract] = useState<Contract | null>(null);

  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeModal, setCompleteModal] = useState<Contract | null>(null);

  // Which card's "..." menu is currently open (null = none)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Contracts only carry business_id / creator_id, not photos — cache
  // each unique business logo / creator profile picture by id once fetched.
  const [businessLogos, setBusinessLogos] = useState<Record<number, string>>({});
  const [creatorAvatars, setCreatorAvatars] = useState<Record<number, string>>({});

  const loadContracts = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getContracts();
      setContracts(result);
      void loadProfilePhotos(result);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Could not load your collaboration history.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadProfilePhotos = async (list: Contract[]) => {
    const businessIds = Array.from(
      new Set(list.map((c) => c.business_id).filter(Boolean))
    ).filter((id) => !(id in businessLogos));

    const creatorIds = Array.from(
      new Set(list.map((c) => c.creator_id).filter(Boolean))
    ).filter((id) => !(id in creatorAvatars));

    const businessResults = await Promise.allSettled(
      businessIds.map((id) => getPublicBusinessProfile(id))
    );

    const creatorResults = await Promise.allSettled(
      creatorIds.map((id) => getCreatorProfile(id))
    );

    setBusinessLogos((current) => {
      const next = { ...current };
      businessResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.logo_url) {
          next[businessIds[index]] = result.value.logo_url;
        }
      });
      return next;
    });

    setCreatorAvatars((current) => {
      const next = { ...current };
      creatorResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.profile_image) {
          next[creatorIds[index]] = result.value.profile_image;
        }
      });
      return next;
    });
  };

  useEffect(() => {
    void loadContracts();
  }, []);

  // Close the "..." menu on outside click
  useEffect(() => {
    if (openMenuId === null) return;

    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.ch-card-actions')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      if (filter !== 'all' && contract.status !== filter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        contract.campaign_title,
        contract.creator_name,
        contract.business_name,
        contract.engagement_type,
        contract.pricing_model,
        contract.status,
        String(contract.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [contracts, filter, search]);

  const handleComplete = async () => {
    if (!completeModal) return;

    setCompletingId(completeModal.id);
    setError('');

    try {
      const updated = await completeContract(completeModal.id);

      setContracts((current) =>
        current.map((contract) =>
          contract.id === updated.id ? updated : contract
        )
      );

      // Keep the popup open showing the freshly completed record
      setDetailContract(updated);
      setCompleteModal(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Could not complete this collaboration.'
      );
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <AppLayout
      title={isCreator ? 'Contract History' : 'Collaboration History'}
      subtitle={
        isCreator
          ? 'View your contracts, active collaborations and completed work.'
          : 'Manage your active and completed collaborations with creators.'
      }
      showSearch={false}
    >
      <div className="collab-history-page">
        <style>{`
          .collab-history-page {
            width: 100%;
            max-width: 1280px;
            margin: 0 auto;
            padding: 4px 0 60px;
            color: #111217;
            font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .collab-history-page * {
            box-sizing: border-box;
          }

          .ch-top {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 24px;
            margin-bottom: 22px;
          }

          .ch-search {
            width: min(430px, 100%);
            height: 43px;
            display: flex;
            align-items: center;
            gap: 9px;
            border: 1px solid #e0e3e8;
            border-radius: 9px;
            background: #fff;
            padding: 0 13px;
          }

          .ch-search svg {
            color: #858d99;
            flex-shrink: 0;
          }

          .ch-search input {
            width: 100%;
            border: 0;
            outline: none;
            background: transparent;
            color: #111217;
            font: 400 12px Poppins, sans-serif;
          }

          .ch-search input::placeholder {
            color: #9ba1aa;
          }

          .ch-tabs {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 20px;
          }

          .ch-tab {
            height: 38px;
            padding: 0 17px;
            border: 1px solid #e0e3e8;
            border-radius: 8px;
            background: #fff;
            color: #444b55;
            font: 500 11px Poppins, sans-serif;
            cursor: pointer;
          }

          .ch-tab:hover {
            border-color: #111;
          }

          .ch-tab.active {
            background: #111;
            color: #fff;
            border-color: #111;
          }

          .ch-list-title {
            margin: 0 0 13px;
            font-size: 15px;
            font-weight: 700;
          }

          .ch-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          /* ---- Collaboration card (redesigned) ---- */

          .ch-card {
            display: flex;
            align-items: center;
            gap: 22px;
            min-height: 92px;
            padding: 16px 20px;
            border: 1px solid #e4e6ea;
            border-radius: 11px;
            background: #fff;
            cursor: pointer;
            transition: border-color .16s ease, box-shadow .16s ease;
          }

          .ch-card:hover {
            border-color: #c9cdd4;
            box-shadow: 0 5px 18px rgba(0,0,0,.035);
          }

          /* business */

          .ch-card-business {
            flex: 1.6 1 0;
            min-width: 0;
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .ch-biz-icon {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: grid;
            place-items: center;
            overflow: hidden;
          }

          .ch-biz-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .ch-biz-info {
            min-width: 0;
          }

          .ch-biz-name {
            font-size: 13px;
            font-weight: 700;
            color: #111;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .ch-biz-subtitle {
            margin-top: 3px;
            font-size: 11px;
            color: #6b7078;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .ch-biz-tag {
            display: inline-block;
            margin-top: 8px;
            padding: 4px 9px;
            border-radius: 99px;
            background: #F1EEFC;
            color: #6B5FBE;
            font-size: 9.5px;
            font-weight: 600;
            white-space: nowrap;
          }

          /* creator */

          .ch-card-creator {
            flex: 1.3 1 0;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .ch-creator-avatar-link {
            display: inline-flex;
            flex-shrink: 0;
            border-radius: 50%;
          }

          .ch-creator-avatar-link:hover .ch-creator-avatar {
            outline: 2px solid #d8dbe0;
          }

          .ch-creator-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            overflow: hidden;
            background: #eceef1;
            color: #555;
            font-size: 12px;
            font-weight: 700;
          }

          .ch-creator-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .ch-creator-info {
            min-width: 0;
          }

          .ch-creator-name {
            font-size: 12.5px;
            font-weight: 700;
            color: #111;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .ch-creator-role {
            margin-top: 2px;
            font-size: 10px;
            color: #838a94;
          }

          .ch-creator-link {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 5px;
            color: #5B5FE0;
            font-size: 10px;
            font-weight: 500;
            text-decoration: none;
          }

          .ch-creator-link:hover {
            text-decoration: underline;
          }

          /* meta (period + compensation) */

          .ch-card-meta {
            flex: 1.6 1 0;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
            border-left: 1px solid #eceef1;
            padding-left: 18px;
          }

          .ch-meta-row {
            display: flex;
            align-items: flex-start;
            gap: 9px;
          }

          .ch-meta-row svg {
            flex-shrink: 0;
            margin-top: 2px;
            color: #98A1AC;
          }

          .ch-meta-label {
            font-size: 9.5px;
            color: #8992A0;
          }

          .ch-meta-value {
            margin-top: 2px;
            font-size: 11.5px;
            font-weight: 600;
            color: #262B33;
          }

          /* actions */

          .ch-card-actions {
            position: relative;
            flex: 0 0 150px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 9px;
          }

          .ch-card-actions-buttons {
            display: flex;
            gap: 8px;
            width: 100%;
          }

          .ch-status {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            padding: 6px 10px;
            border-radius: 99px;
            font-size: 9px;
            font-weight: 600;
            white-space: nowrap;
          }

          .ch-status.active {
            color: #14753b;
            background: #e6f7ed;
          }

          .ch-status.completed {
            color: #14753b;
            background: #e6f7ed;
          }

          .ch-status.cancelled {
            color: #b33b3b;
            background: #fdecec;
          }

          .ch-status.pending_payment,
          .ch-status.draft {
            color: #8a641b;
            background: #fff5dd;
          }

          .ch-view-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            min-height: 34px;
            border: 1px solid #cfd4dc;
            border-radius: 7px;
            background: #fff;
            color: #252a31;
            text-decoration: none;
            font-size: 9px;
            font-weight: 600;
            white-space: nowrap;
          }

          .ch-view-btn:hover {
            background: #111;
            color: #fff;
            border-color: #111;
          }

          .ch-more-btn {
            flex-shrink: 0;
            width: 34px;
            min-height: 34px;
            display: grid;
            place-items: center;
            border: 1px solid #cfd4dc;
            border-radius: 7px;
            background: #fff;
            color: #333;
            cursor: pointer;
          }

          .ch-more-btn:hover {
            border-color: #111;
            color: #111;
          }

          .ch-more-menu {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 6px;
            width: 170px;
            border: 1px solid #e2e4e8;
            border-radius: 9px;
            background: #fff;
            box-shadow: 0 12px 28px rgba(0,0,0,.1);
            overflow: hidden;
            z-index: 20;
          }

          .ch-more-menu button {
            display: block;
            width: 100%;
            text-align: left;
            padding: 10px 13px;
            border: 0;
            background: none;
            font: 600 10px Poppins, sans-serif;
            color: #222;
            cursor: pointer;
          }

          .ch-more-menu button:hover:not(:disabled) {
            background: #f5f5f6;
          }

          .ch-more-menu button:disabled {
            color: #aaa;
            cursor: default;
          }

          .ch-empty {
            min-height: 270px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            border: 1px solid #e4e6ea;
            border-radius: 11px;
            background: #fff;
            color: #777;
          }

          .ch-empty h3 {
            margin: 13px 0 4px;
            color: #111;
            font-size: 16px;
          }

          .ch-empty p {
            margin: 0;
            font-size: 11px;
          }

          .ch-error {
            margin-bottom: 14px;
            padding: 11px 13px;
            border-radius: 8px;
            background: #fff0f0;
            color: #a42e2e;
            font-size: 11px;
          }

          .ch-loading {
            min-height: 300px;
            display: grid;
            place-items: center;
            color: #777;
            font-size: 12px;
          }

          /* DETAIL POPUP */

          .ch-detail-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(15, 23, 42, .46);
          }

          .ch-detail-modal {
            width: min(520px, 100%);
            max-height: 88vh;
            overflow-y: auto;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 25px 70px rgba(0,0,0,.22);
          }

          .ch-detail-hero {
            position: relative;
            height: 130px;
            margin: 14px;
            border-radius: 8px;
            overflow: hidden;
            background: #f0f1f2;
          }

          .ch-detail-hero img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .ch-detail-hero-placeholder {
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
            color: #969da7;
          }

          .ch-detail-status {
            position: absolute;
            top: 10px;
            right: 10px;
          }

          .ch-detail-close {
            position: absolute;
            top: 10px;
            left: 10px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,.92);
            color: #222;
            display: grid;
            place-items: center;
            cursor: pointer;
          }

          .ch-detail-close:hover {
            background: #fff;
          }

          .ch-detail-body {
            padding: 0 22px 24px;
          }

          .ch-detail-title {
            margin: 4px 0 4px;
            font-size: 19px;
            line-height: 1.25;
            font-weight: 700;
          }

          .ch-detail-business {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #5f6771;
            font-size: 12px;
          }

          .ch-detail-business-logo-link {
            display: inline-flex;
            flex-shrink: 0;
            border-radius: 7px;
          }

          .ch-detail-business-logo-link:hover {
            outline: 2px solid #d8dbe0;
          }

          .ch-detail-business-logo {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            object-fit: cover;
            display: block;
          }

          .ch-detail-business-logo-fallback {
            display: grid;
            place-items: center;
            background: #eceef1;
            color: #555;
          }

          .ch-detail-creator {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 18px 0;
          }

          .ch-detail-creator-avatar-link {
            display: inline-flex;
            flex-shrink: 0;
            border-radius: 50%;
          }

          .ch-detail-creator-avatar-link:hover .ch-detail-creator-avatar {
            outline: 2px solid #d8dbe0;
          }

          .ch-detail-creator-avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            overflow: hidden;
            background: #eceef1;
            color: #555;
            font-size: 15px;
            font-weight: 700;
          }

          .ch-detail-creator-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .ch-detail-creator-name {
            font-size: 13px;
            font-weight: 600;
          }

          .ch-detail-creator-role {
            margin-top: 2px;
            font-size: 10px;
            color: #737b86;
          }

          .ch-detail-divider {
            height: 1px;
            background: #e8eaed;
            margin: 17px 0;
          }

          .ch-detail-row {
            display: grid;
            grid-template-columns: 20px minmax(110px, 1fr) minmax(100px, 1fr);
            gap: 8px;
            align-items: start;
            min-height: 33px;
          }

          .ch-detail-row svg {
            color: #69717c;
            margin-top: 1px;
          }

          .ch-detail-row-label {
            font-size: 10px;
            color: #555e69;
          }

          .ch-detail-row-value {
            text-align: right;
            font-size: 10px;
            color: #333941;
          }

          .ch-detail-section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 9px;
            font-size: 12px;
            font-weight: 700;
          }

          .ch-deliverables {
            margin: 0;
            padding-left: 19px;
            color: #555e69;
            font-size: 10px;
            line-height: 1.75;
          }

          .ch-payment-note {
            padding: 13px;
            border-radius: 9px;
            background: #f5f5f5;
            color: #59616c;
            font-size: 9px;
            line-height: 1.6;
          }

          .ch-payment-note strong {
            color: #222;
            display: block;
            margin-bottom: 3px;
          }

          .ch-manage-panel {
            margin-top: 17px;
            padding: 14px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background: #fafafa;
          }

          .ch-manage-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 12px;
            font-size: 11px;
            font-weight: 700;
          }

          .ch-manage-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .ch-manage-item {
            padding: 9px;
            border-radius: 7px;
            background: #fff;
            border: 1px solid #e7e8eb;
          }

          .ch-manage-item-label {
            color: #7b838d;
            font-size: 8px;
          }

          .ch-manage-item-value {
            margin-top: 3px;
            color: #222;
            font-size: 10px;
            font-weight: 600;
          }

          .ch-complete-btn {
            width: 100%;
            min-height: 38px;
            margin-top: 12px;
            border: 1px solid #111;
            border-radius: 8px;
            background: #111;
            color: #fff;
            font: 600 10px Poppins, sans-serif;
            cursor: pointer;
          }

          .ch-complete-btn:hover:not(:disabled) {
            background: #292929;
          }

          .ch-complete-btn:disabled {
            opacity: .55;
            cursor: not-allowed;
          }

          .ch-record-note {
            margin-top: 13px;
            color: #7b838d;
            font-size: 9px;
            line-height: 1.55;
          }

          /* COMPLETE CONFIRM MODAL */

          .ch-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(15, 23, 42, .46);
          }

          .ch-modal {
            width: min(470px, 100%);
            border-radius: 14px;
            background: #fff;
            padding: 24px;
            box-shadow: 0 25px 70px rgba(0,0,0,.22);
          }

          .ch-modal h2 {
            margin: 0;
            font-size: 18px;
          }

          .ch-modal p {
            color: #656d78;
            font-size: 12px;
            line-height: 1.6;
          }

          .ch-modal-record {
            margin: 16px 0;
            padding: 14px;
            border: 1px solid #e6e7e9;
            border-radius: 9px;
            background: #fafafa;
          }

          .ch-modal-record-row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 8px;
            font-size: 11px;
          }

          .ch-modal-record-row:last-child {
            margin-bottom: 0;
          }

          .ch-modal-record-label {
            color: #737b85;
          }

          .ch-modal-record-value {
            text-align: right;
            color: #222;
            font-weight: 600;
          }

          .ch-confirm {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin: 16px 0;
            color: #505862;
            font-size: 10px;
            line-height: 1.5;
          }

          .ch-confirm input {
            margin-top: 2px;
          }

          .ch-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }

          .ch-modal-cancel,
          .ch-modal-confirm {
            min-height: 36px;
            padding: 0 15px;
            border-radius: 8px;
            font: 600 10px Poppins, sans-serif;
            cursor: pointer;
          }

          .ch-modal-cancel {
            border: 1px solid #d8dbe0;
            background: #fff;
            color: #333;
          }

          .ch-modal-confirm {
            border: 1px solid #111;
            background: #111;
            color: #fff;
          }

          .ch-modal-confirm:disabled {
            opacity: .5;
            cursor: not-allowed;
          }

          @media (max-width: 900px) {
            .ch-card {
              flex-wrap: wrap;
              row-gap: 14px;
            }

            .ch-card-business {
              flex: 1 1 60%;
            }

            .ch-card-creator {
              flex: 1 1 35%;
            }

            .ch-card-meta {
              flex: 1 1 100%;
              flex-direction: row;
              gap: 26px;
              border-left: 0;
              padding-left: 0;
              order: 3;
            }

            .ch-card-actions {
              flex: 1 1 100%;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
              order: 4;
            }

            .ch-card-actions-buttons {
              width: auto;
              flex: 1;
              margin-left: 14px;
            }
          }

          @media (max-width: 800px) {
            .ch-top {
              justify-content: stretch;
            }

            .ch-search {
              width: 100%;
            }
          }

          @media (max-width: 560px) {
            .ch-card {
              flex-direction: column;
              align-items: stretch;
            }

            .ch-card-business,
            .ch-card-creator,
            .ch-card-meta,
            .ch-card-actions {
              flex: 1 1 100%;
            }

            .ch-card-meta {
              flex-direction: column;
              gap: 10px;
            }

            .ch-card-actions {
              flex-direction: column;
              align-items: stretch;
            }

            .ch-card-actions-buttons {
              width: 100%;
              margin-left: 0;
            }

            .ch-detail-row {
              grid-template-columns: 20px 1fr;
            }

            .ch-detail-row-value {
              grid-column: 2;
              text-align: left;
              margin-top: -5px;
            }
          }
        `}</style>

        <div className="ch-top">
          <div className="ch-search">
            <Search size={16} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isCreator
                  ? 'Search by campaign or business...'
                  : 'Search by campaign, business or creator...'
              }
            />
          </div>
        </div>

        <div className="ch-tabs">
          <button
            type="button"
            className={`ch-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>

          <button
            type="button"
            className={`ch-tab ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>

          <button
            type="button"
            className={`ch-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>

          <button
            type="button"
            className={`ch-tab ${filter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled
          </button>

          {isBusiness && (
            <button
              type="button"
              className={`ch-tab ${filter === 'pending_payment' ? 'active' : ''}`}
              onClick={() => setFilter('pending_payment')}
            >
              Pending Payment
            </button>
          )}
        </div>

        {error && <div className="ch-error">{error}</div>}

        {loading ? (
          <div className="ch-loading">Loading collaboration history…</div>
        ) : (
          <section>
            <h2 className="ch-list-title">
              {filter === 'all'
                ? 'Past & Current Collaborations'
                : `${statusLabel(filter)} Collaborations`}
            </h2>

            {filteredContracts.length === 0 ? (
              <div className="ch-empty">
                <BriefcaseBusiness size={28} strokeWidth={1.4} />
                <h3>No collaborations found</h3>
                <p>Try another search or filter.</p>
              </div>
            ) : (
              <div className="ch-list">
                {filteredContracts.map((contract) => (
                  <CollaborationCard
                    key={`contract-${contract.id}`}
                    contract={contract}
                    isCreator={isCreator}
                    isBusiness={isBusiness}
                    businessLogo={businessLogos[contract.business_id]}
                    creatorAvatar={creatorAvatars[contract.creator_id]}
                    menuOpen={openMenuId === contract.id}
                    onSelect={() => setDetailContract(contract)}
                    onToggleMenu={() =>
                      setOpenMenuId((current) =>
                        current === contract.id ? null : contract.id
                      )
                    }
                    onComplete={() => setCompleteModal(contract)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {detailContract && (
          <div
            className="ch-detail-overlay"
            onClick={() => setDetailContract(null)}
          >
            <div
              className="ch-detail-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <CollaborationDetail
                contract={detailContract}
                isCreator={isCreator}
                isBusiness={isBusiness}
                completingId={completingId}
                businessLogo={businessLogos[detailContract.business_id]}
                creatorAvatar={creatorAvatars[detailContract.creator_id]}
                onClose={() => setDetailContract(null)}
                onComplete={() => setCompleteModal(detailContract)}
              />
            </div>
          </div>
        )}

        {completeModal && (
          <CompleteModal
            contract={completeModal}
            completing={completingId === completeModal.id}
            onCancel={() => setCompleteModal(null)}
            onConfirm={() => void handleComplete()}
          />
        )}
      </div>
    </AppLayout>
  );
}

function CollaborationCard({
  contract,
  isCreator,
  isBusiness,
  businessLogo,
  creatorAvatar,
  menuOpen,
  onSelect,
  onToggleMenu,
  onComplete,
}: {
  contract: Contract;
  isCreator: boolean;
  isBusiness: boolean;
  businessLogo?: string;
  creatorAvatar?: string;
  menuOpen: boolean;
  onSelect: () => void;
  onToggleMenu: () => void;
  onComplete: () => void;
}) {
  const palette = bizPalette(contract.business_name);
  const tag = getCategoryTag(contract);

  const creatorInitials = (contract.creator_name || 'C')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const canComplete = isBusiness && contract.status === 'active';

  return (
    <article className="ch-card" onClick={onSelect}>
      <div className="ch-card-business">
        <span className="ch-biz-icon" style={{ background: palette.bg }}>
          {businessLogo ? (
            <img src={businessLogo} alt="" />
          ) : (
            <BriefcaseBusiness size={18} color={palette.fg} />
          )}
        </span>

        <div className="ch-biz-info">
          <div className="ch-biz-name">
            {contract.business_name || 'Business'}
          </div>

          {contract.campaign_title && (
            <div className="ch-biz-subtitle">{contract.campaign_title}</div>
          )}

          {tag && <span className="ch-biz-tag">{tag}</span>}
        </div>
      </div>

      <div className="ch-card-creator">
        <Link
          to={`/creators/${contract.creator_id}`}
          className="ch-creator-avatar-link"
          onClick={(event) => event.stopPropagation()}
          aria-label={`View ${contract.creator_name || 'creator'} profile`}
        >
          <span className="ch-creator-avatar">
            {creatorAvatar ? (
              <img src={creatorAvatar} alt="" />
            ) : (
              creatorInitials
            )}
          </span>
        </Link>

        <div className="ch-creator-info">
          <div className="ch-creator-name">
            {contract.creator_name || 'Creator'}
          </div>
          <div className="ch-creator-role">Creator</div>

          <Link
            to={`/creators/${contract.creator_id}`}
            className="ch-creator-link"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink size={10} />
            View creator profile
          </Link>
        </div>
      </div>

      <div className="ch-card-meta">
        <div className="ch-meta-row">
          <CalendarDays size={14} />
          <div>
            <div className="ch-meta-label">Collaboration Period</div>
            <div className="ch-meta-value">
              {contract.duration ||
                `${formatDate(contract.start_date)} – ${formatDate(
                  contract.end_date
                )}`}
            </div>
          </div>
        </div>

        <div className="ch-meta-row">
          <Eye size={14} />
          <div>
            <div className="ch-meta-label">Compensation</div>
            <div className="ch-meta-value">{money(contract.agreed_rate)}</div>
          </div>
        </div>
      </div>

      <div className="ch-card-actions">
        <span className={`ch-status ${contract.status}`}>
          <StatusIcon status={contract.status} size={12} />
          {statusLabel(contract.status)}
        </span>

        <div className="ch-card-actions-buttons">
          <Link
            to={`/contracts/${contract.id}`}
            className="ch-view-btn"
            onClick={(event) => event.stopPropagation()}
          >
            View Details
          </Link>

          <button
            type="button"
            className="ch-more-btn"
            onClick={(event) => {
              event.stopPropagation();
              onToggleMenu();
            }}
            aria-label="More actions"
          >
            <MoreHorizontal size={15} />
          </button>
        </div>

        {menuOpen && (
          <div className="ch-more-menu" onClick={(event) => event.stopPropagation()}>
            {canComplete ? (
              <button
                type="button"
                onClick={() => {
                  onComplete();
                  onToggleMenu();
                }}
              >
                Mark Complete
              </button>
            ) : (
              <button type="button" disabled>
                No further actions
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function CollaborationDetail({
  contract,
  isCreator,
  isBusiness,
  completingId,
  businessLogo,
  creatorAvatar,
  onClose,
  onComplete,
}: {
  contract: Contract;
  isCreator: boolean;
  isBusiness: boolean;
  completingId: number | null;
  businessLogo?: string;
  creatorAvatar?: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const image = getCampaignImage(contract);

  const creatorInitials = (contract.creator_name || 'Creator')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="ch-detail-hero">
        {image ? (
          <img src={image} alt="" />
        ) : (
          <div className="ch-detail-hero-placeholder">
            <BriefcaseBusiness size={35} strokeWidth={1.3} />
          </div>
        )}

        <button
          type="button"
          className="ch-detail-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="ch-detail-status">
          <span className={`ch-status ${contract.status}`}>
            <StatusIcon status={contract.status} size={12} />
            {statusLabel(contract.status)}
          </span>
        </div>
      </div>

      <div className="ch-detail-body">
        <h2 className="ch-detail-title">
          {contract.campaign_title || `Campaign #${contract.campaign_id}`}
        </h2>

        <div className="ch-detail-business">
          <Link
            to={`/businesses/${contract.business_id}`}
            className="ch-detail-business-logo-link"
            onClick={(event) => event.stopPropagation()}
            aria-label={`View ${contract.business_name || 'business'} profile`}
          >
            {businessLogo ? (
              <img
                className="ch-detail-business-logo"
                src={businessLogo}
                alt=""
              />
            ) : (
              <span className="ch-detail-business-logo ch-detail-business-logo-fallback">
                <BriefcaseBusiness size={14} />
              </span>
            )}
          </Link>
          {contract.business_name || 'Business'}
        </div>

        <div className="ch-detail-creator">
          <Link
            to={`/creators/${contract.creator_id}`}
            className="ch-detail-creator-avatar-link"
            onClick={(event) => event.stopPropagation()}
            aria-label={`View ${contract.creator_name || 'creator'} profile`}
          >
            <div className="ch-detail-creator-avatar">
              {creatorAvatar ? (
                <img src={creatorAvatar} alt="" />
              ) : (
                creatorInitials
              )}
            </div>
          </Link>

          <div>
            <div className="ch-detail-creator-name">
              {contract.creator_name || 'Creator'}
            </div>
            <div className="ch-detail-creator-role">Creator</div>
          </div>
        </div>

        <div className="ch-detail-divider" />

        <DetailRow
          icon={<UserRound size={15} />}
          label="Business"
          value={contract.business_name || 'Business'}
        />

        <DetailRow
          icon={<BriefcaseBusiness size={15} />}
          label="Engagement"
          value={contract.engagement_type || 'Not specified'}
        />

        <DetailRow
          icon={<CalendarDays size={15} />}
          label="Work period"
          value={
            contract.start_date || contract.end_date
              ? `${formatDate(contract.start_date)} – ${formatDate(
                  contract.end_date
                )}`
              : 'Not specified'
          }
        />

        <DetailRow
          icon={<CreditCard size={15} />}
          label="Compensation"
          value={
            contract.agreed_rate
              ? `${money(contract.agreed_rate)}${
                  contract.pricing_model ? ` / ${contract.pricing_model}` : ''
                }`
              : 'Not finalized'
          }
        />

        <DetailRow
          icon={<CircleDollarSign size={15} />}
          label="Total contract value"
          value={money(contract.total_value)}
        />

        <DetailRow
          icon={<ShieldCheck size={15} />}
          label="CreatorHub service fee (10%)"
          value={money(contract.platform_fee_amount)}
        />

        <div className="ch-detail-divider" />

        <div>
          <div className="ch-detail-section-title">
            <FileText size={15} />
            Contract information
          </div>

          <ul className="ch-deliverables">
            <li>Contract ID: CH-{String(contract.id).padStart(4, '0')}</li>
            <li>Campaign ID: #{contract.campaign_id}</li>
            <li>Application ID: #{contract.application_id}</li>
            <li>Created: {formatDate(contract.created_at)}</li>
            {contract.terms_note && <li>Agreed terms recorded</li>}
          </ul>
        </div>

        <div className="ch-detail-divider" />

        <div>
          <div className="ch-detail-section-title">
            <CreditCard size={15} />
            Payment details
          </div>

          <div className="ch-payment-note">
            <strong>Creator payment</strong>
            Creator compensation is handled directly between the business and
            creator.
            <br />
            CreatorHub processes only the platform service fee.
            <br />
            <br />
            <strong>Platform fee</strong>
            {money(contract.platform_fee_amount)}
            <br />
            Status: {contract.fee_paid ? 'Paid' : 'Pending'}
            {contract.payment_reference && (
              <>
                <br />
                Receipt: {contract.payment_reference}
              </>
            )}
          </div>
        </div>

        {isBusiness && contract.status === 'active' && (
          <div className="ch-manage-panel">
            <div className="ch-manage-title">
              <span>Manage Collaboration</span>
              <PlayCircle size={15} />
            </div>

            <div className="ch-manage-grid">
              <div className="ch-manage-item">
                <div className="ch-manage-item-label">STATUS</div>
                <div className="ch-manage-item-value">Active</div>
              </div>

              <div className="ch-manage-item">
                <div className="ch-manage-item-label">FEE</div>
                <div className="ch-manage-item-value">
                  {contract.fee_paid ? 'Paid' : 'Pending'}
                </div>
              </div>

              <div className="ch-manage-item">
                <div className="ch-manage-item-label">START</div>
                <div className="ch-manage-item-value">
                  {formatDate(contract.start_date)}
                </div>
              </div>

              <div className="ch-manage-item">
                <div className="ch-manage-item-label">END</div>
                <div className="ch-manage-item-value">
                  {formatDate(contract.end_date)}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="ch-complete-btn"
              disabled={completingId === contract.id}
              onClick={onComplete}
            >
              {completingId === contract.id
                ? 'Completing…'
                : 'Mark Collaboration Complete'}
            </button>

            <div className="ch-record-note">
              Completing the collaboration does not delete the contract. The
              campaign, application, terms and payment record remain
              available for historical reference.
            </div>
          </div>
        )}

        {contract.status === 'completed' && (
          <div className="ch-manage-panel">
            <div className="ch-manage-title">
              <span>Collaboration Completed</span>
              <CheckCircle2 size={15} />
            </div>

            <div className="ch-record-note">
              This collaboration has been marked completed. The contract
              remains available as a historical record and cannot be deleted.
            </div>
          </div>
        )}

        {!isCreator && contract.status === 'pending_payment' && (
          <div className="ch-manage-panel">
            <div className="ch-manage-title">
              <span>Payment Required</span>
              <Clock3 size={15} />
            </div>

            <div className="ch-record-note">
              The collaboration cannot become active until the CreatorHub
              service fee is paid.
            </div>

            <Link
              to={`/contracts/${contract.id}`}
              className="ch-view-btn"
              style={{ marginTop: 12 }}
            >
              Open Contract & Pay
            </Link>
          </div>
        )}

        <Link
          to={`/contracts/${contract.id}`}
          className="ch-view-btn"
          style={{ marginTop: 14, minHeight: 38 }}
        >
          <FileText size={13} style={{ marginRight: 6 }} />
          View Full Contract Record
        </Link>
      </div>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="ch-detail-row">
      {icon}
      <div className="ch-detail-row-label">{label}</div>
      <div className="ch-detail-row-value">{value}</div>
    </div>
  );
}

function CompleteModal({
  contract,
  completing,
  onCancel,
  onConfirm,
}: {
  contract: Contract;
  completing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="ch-modal-overlay">
      <div className="ch-modal">
        <h2>Complete Collaboration?</h2>

        <p>
          You are marking this collaboration as completed. This will
          permanently record that the collaboration has ended. The contract
          itself is never deleted — it stays available as a historical
          record.
        </p>

        <div className="ch-modal-record">
          <div className="ch-modal-record-row">
            <span className="ch-modal-record-label">Campaign</span>
            <span className="ch-modal-record-value">
              {contract.campaign_title || `Campaign #${contract.campaign_id}`}
            </span>
          </div>

          <div className="ch-modal-record-row">
            <span className="ch-modal-record-label">Creator</span>
            <span className="ch-modal-record-value">
              {contract.creator_name || 'Creator'}
            </span>
          </div>

          <div className="ch-modal-record-row">
            <span className="ch-modal-record-label">Contract</span>
            <span className="ch-modal-record-value">
              CH-{String(contract.id).padStart(4, '0')}
            </span>
          </div>

          <div className="ch-modal-record-row">
            <span className="ch-modal-record-label">Agreed amount</span>
            <span className="ch-modal-record-value">
              {money(contract.agreed_rate)}
            </span>
          </div>
        </div>

        <label className="ch-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I confirm that the collaboration has been completed according to
            the agreed terms.
          </span>
        </label>

        <div className="ch-modal-actions">
          <button
            type="button"
            className="ch-modal-cancel"
            onClick={onCancel}
            disabled={completing}
          >
            Cancel
          </button>

          <button
            type="button"
            className="ch-modal-confirm"
            onClick={onConfirm}
            disabled={!confirmed || completing}
          >
            {completing ? 'Completing…' : 'Confirm Completion'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContractHistory;