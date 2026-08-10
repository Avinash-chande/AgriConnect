import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import {
  getAdminTrustProfilesApi,
  reviewTrustProfileApi,
  flagTrustProfileApi,
  recalculateTrustScoreApi,
  getAdminCertificatesApi,
  reviewCertificateApi,
  getAdminKycRequestsApi,
  reviewKycApi,
} from '../../services/adminService';
import type { TrustProfileData, CertificateData, IdentityKycData } from '../../types/admin';
import {
  ShieldCheck,
  Award,
  IdCard,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock,
  Flag,
  Ban,
  FileText,
  Star,
  UserCheck,
  Info,
} from 'lucide-react';

type TabType = 'TRUST' | 'CERTIFICATES' | 'IDENTITY' | 'WORK_HISTORY';

export const AdminVerificationDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('TRUST');

  // Sub-filters
  const [trustFilter, setTrustFilter] = useState<'highest_score' | 'recently_verified' | 'top_rated' | 'flagged'>('highest_score');
  const [certFilter, setCertFilter] = useState<string>('PENDING');
  const [kycFilter, setKycFilter] = useState<string>('PENDING');

  // Modal State
  const [selectedTrust, setSelectedTrust] = useState<TrustProfileData | null>(null);
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<IdentityKycData | null>(null);

  const [reviewNotes, setReviewNotes] = useState('');
  const [flagReason, setFlagReason] = useState('');

  // -------------------------------------------------------------
  // Data Queries
  // -------------------------------------------------------------
  const { data: trustData, isLoading: trustLoading } = useQuery({
    queryKey: ['adminTrustVerifications', trustFilter],
    queryFn: () => getAdminTrustProfilesApi({ filterView: trustFilter }),
    enabled: activeTab === 'TRUST',
  });

  const { data: certData, isLoading: certLoading } = useQuery({
    queryKey: ['adminCertificates', certFilter],
    queryFn: () => getAdminCertificatesApi({ status: certFilter === 'ALL' ? '' : certFilter }),
    enabled: activeTab === 'CERTIFICATES',
  });

  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ['adminKycRequests', kycFilter],
    queryFn: () => getAdminKycRequestsApi({ status: kycFilter === 'ALL' ? '' : kycFilter }),
    enabled: activeTab === 'IDENTITY',
  });

  // -------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------
  const trustReviewMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reviewTrustProfileApi(id, status, reviewNotes),
    onSuccess: () => {
      setSelectedTrust(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminTrustVerifications'] });
    },
  });

  const trustFlagMut = useMutation({
    mutationFn: ({ id, isFlagged }: { id: string; isFlagged: boolean }) =>
      flagTrustProfileApi(id, isFlagged, flagReason),
    onSuccess: () => {
      setSelectedTrust(null);
      setFlagReason('');
      queryClient.invalidateQueries({ queryKey: ['adminTrustVerifications'] });
    },
  });

  const recalcMut = useMutation({
    mutationFn: (userId: string) => recalculateTrustScoreApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTrustVerifications'] });
    },
  });

  const certReviewMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reviewCertificateApi(id, status, reviewNotes),
    onSuccess: () => {
      setSelectedCert(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminCertificates'] });
    },
  });

  const kycReviewMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reviewKycApi(id, status, reviewNotes),
    onSuccess: () => {
      setSelectedKyc(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminKycRequests'] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Audit & Authorization Banner */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Admin Verification Dashboard
              </h1>
              <p className="text-xs text-slate-400">
                Unified management for AgriConnect Trust Engine (System A), Skill Certificates, Identity e-KYC (System B), and Work History.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <Lock size={12} />
            <span>ALL ACTIONS AUDITED & AUTHORIZED</span>
          </div>
        </div>

        {/* Top Level Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('TRUST')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center space-x-2 transition-all ${
              activeTab === 'TRUST'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Trust Verification (System A)</span>
          </button>

          <button
            onClick={() => setActiveTab('CERTIFICATES')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center space-x-2 transition-all ${
              activeTab === 'CERTIFICATES'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Award size={16} />
            <span>Certificates</span>
          </button>

          <button
            onClick={() => setActiveTab('IDENTITY')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center space-x-2 transition-all ${
              activeTab === 'IDENTITY'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/10'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <IdCard size={16} />
            <span>Identity Verification (System B)</span>
          </button>

          <button
            onClick={() => setActiveTab('WORK_HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center space-x-2 transition-all ${
              activeTab === 'WORK_HISTORY'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-lg shadow-teal-500/10'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <History size={16} />
            <span>Work History</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: TRUST VERIFICATION */}
        {/* ============================================================ */}
        {activeTab === 'TRUST' && (
          <div className="space-y-4">
            {/* Sub Filters */}
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {[
                { id: 'highest_score', label: 'Highest Trust Scores' },
                { id: 'recently_verified', label: 'Recently Verified' },
                { id: 'top_rated', label: 'Top Rated' },
                { id: 'flagged', label: 'Flagged Profiles' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTrustFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    trustFilter === f.id
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Trust Score</th>
                      <th className="p-4">Level</th>
                      <th className="p-4">Completed Jobs</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {trustLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">Loading Trust Profiles...</td>
                      </tr>
                    ) : trustData?.records?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">No trust profiles matching criteria.</td>
                      </tr>
                    ) : (
                      trustData?.records?.map((r: TrustProfileData) => (
                        <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-semibold text-white">
                            <div className="flex items-center space-x-2">
                              <span>{r.user?.name || 'Worker'}</span>
                              {r.isFlagged && (
                                <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-mono text-[9px]">
                                  FLAGGED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-bold font-mono text-emerald-400">{r.trustScore} / 100</td>
                          <td className="p-4 font-mono">{r.trustLevel}</td>
                          <td className="p-4 font-mono">{r.completedJobs || 0}</td>
                          <td className="p-4 font-mono text-amber-400">⭐ {(r.averageRating || 0).toFixed(1)}</td>
                          <td className="p-4">
                            <StatusBadge status={r.status} type={r.status === 'verified' ? 'success' : 'warning'} />
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => recalcMut.mutate(r.user?._id || '')}
                              title="Recalculate Trust Score"
                              className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button
                              onClick={() => setSelectedTrust(r)}
                              className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-mono text-[11px]"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: CERTIFICATES */}
        {/* ============================================================ */}
        {activeTab === 'CERTIFICATES' && (
          <div className="space-y-4">
            {/* Sub Filters */}
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUESTED', 'ALL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setCertFilter(st)}
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    certFilter === st
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-4">Worker</th>
                      <th className="p-4">Certificate Type</th>
                      <th className="p-4">Title</th>
                      <th className="p-4">Submitted At</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {certLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">Loading Skill Certificates...</td>
                      </tr>
                    ) : certData?.certificates?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">No certificates matching criteria.</td>
                      </tr>
                    ) : (
                      certData?.certificates?.map((c: CertificateData) => (
                        <tr key={c._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-semibold text-white">{c.user?.name || 'Worker'}</td>
                          <td className="p-4 font-mono text-amber-400">{c.certificateType}</td>
                          <td className="p-4 text-slate-200">{c.title}</td>
                          <td className="p-4 font-mono text-slate-400">{new Date(c.submittedAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <StatusBadge status={c.status} type={c.status === 'APPROVED' ? 'success' : 'warning'} />
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedCert(c)}
                              className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-mono text-[11px]"
                            >
                              Review Document
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: IDENTITY VERIFICATION (System B) */}
        {/* ============================================================ */}
        {activeTab === 'IDENTITY' && (
          <div className="space-y-4">
            {/* Sub Filters */}
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {['PENDING', 'PROCESSING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW', 'ALL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setKycFilter(st)}
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    kycFilter === st
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Masked Reference</th>
                      <th className="p-4">Digital Signature</th>
                      <th className="p-4">Name Match</th>
                      <th className="p-4">Identity Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {kycLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">Loading e-KYC Queue...</td>
                      </tr>
                    ) : kycData?.records?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">No identity requests matching criteria.</td>
                      </tr>
                    ) : (
                      kycData?.records?.map((k: IdentityKycData) => (
                        <tr key={k._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-semibold text-white">{k.user?.name || 'User'}</td>
                          <td className="p-4 font-mono text-slate-300">{k.referenceId || 'XXXX-XXXX-****'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                              k.signatureVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {k.signatureVerified ? 'VALID SIGNATURE ✓' : 'INVALID'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                              k.nameMatch ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {k.nameMatch ? 'MATCHED ✓' : 'UNMATCHED'}
                            </span>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={k.status} type={k.status === 'VERIFIED' ? 'success' : 'warning'} />
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedKyc(k)}
                              className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-mono text-[11px]"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: WORK HISTORY */}
        {/* ============================================================ */}
        {activeTab === 'WORK_HISTORY' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-slate-200 font-heading font-bold text-sm">
              <History className="text-teal-400" size={20} />
              <span>Verified Work History Audit Stream</span>
            </div>
            <p className="text-xs text-slate-400">
              Shows all job completion events verified by farmers. Only completed, verified jobs increment a worker's Trust Score and auto-award experience badges.
            </p>
            <div className="p-8 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
              Verified work history logs active. Every job completion automatically updates Trust Score & work metrics in real-time.
            </div>
          </div>
        )}

        {/* Modals for Admin Actions */}
        {selectedTrust && (
          <AdminModal
            isOpen={!!selectedTrust}
            onClose={() => setSelectedTrust(null)}
            title={`Manage Trust Profile: ${selectedTrust.user?.name}`}
          >
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
                <p>Trust Score: <span className="text-emerald-400 font-bold">{selectedTrust.trustScore}/100</span></p>
                <p>Trust Level: <span className="text-white">{selectedTrust.trustLevel}</span></p>
                <p>Completed Jobs: <span className="text-white">{selectedTrust.completedJobs}</span></p>
              </div>

              <textarea
                placeholder="Enter review notes or flag reason..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                rows={3}
              />

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  onClick={() => trustFlagMut.mutate({ id: selectedTrust._id, isFlagged: !selectedTrust.isFlagged })}
                  className="px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 font-mono text-[11px]"
                >
                  {selectedTrust.isFlagged ? 'Unflag Profile' : 'Flag Profile'}
                </button>
                <button
                  onClick={() => trustReviewMut.mutate({ id: selectedTrust._id, status: 'SUSPENDED' })}
                  className="px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 font-mono text-[11px]"
                >
                  Suspend Verification
                </button>
                <button
                  onClick={() => trustReviewMut.mutate({ id: selectedTrust._id, status: 'verified' })}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 font-mono text-[11px]"
                >
                  Approve Verification
                </button>
              </div>
            </div>
          </AdminModal>
        )}

        {/* Certificate Modal */}
        {selectedCert && (
          <AdminModal
            isOpen={!!selectedCert}
            onClose={() => setSelectedCert(null)}
            title={`Review Skill Certificate: ${selectedCert.title}`}
          >
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <p><span className="text-slate-400 font-mono">Worker:</span> <span className="text-white font-semibold">{selectedCert.user?.name}</span></p>
                <p><span className="text-slate-400 font-mono">Type:</span> <span className="text-amber-400 font-mono">{selectedCert.certificateType}</span></p>
              </div>

              <textarea
                placeholder="Enter review notes..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                rows={3}
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => certReviewMut.mutate({ id: selectedCert._id, status: 'RESUBMISSION_REQUESTED' })}
                  className="px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-mono text-[11px]"
                >
                  Request Resubmission
                </button>
                <button
                  onClick={() => certReviewMut.mutate({ id: selectedCert._id, status: 'REJECTED' })}
                  className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-mono text-[11px]"
                >
                  Reject
                </button>
                <button
                  onClick={() => certReviewMut.mutate({ id: selectedCert._id, status: 'APPROVED' })}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-mono text-[11px]"
                >
                  Approve & Issue SKILL_VERIFIED Badge
                </button>
              </div>
            </div>
          </AdminModal>
        )}

        {/* Identity KYC Modal */}
        {selectedKyc && (
          <AdminModal
            isOpen={!!selectedKyc}
            onClose={() => setSelectedKyc(null)}
            title={`Review Identity e-KYC: ${selectedKyc.user?.name}`}
          >
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-slate-300">
                <p>Masked Ref ID: <span className="text-white">{selectedKyc.referenceId}</span></p>
                <p>Digital Signature: <span className="text-emerald-400">{selectedKyc.signatureVerified ? 'VALID ✓' : 'INVALID'}</span></p>
              </div>

              <textarea
                placeholder="Enter admin review notes..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                rows={3}
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => kycReviewMut.mutate({ id: selectedKyc._id, status: 'RESUBMISSION_REQUIRED' })}
                  className="px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-mono text-[11px]"
                >
                  Request Resubmission
                </button>
                <button
                  onClick={() => kycReviewMut.mutate({ id: selectedKyc._id, status: 'REJECTED' })}
                  className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-mono text-[11px]"
                >
                  Reject
                </button>
                <button
                  onClick={() => kycReviewMut.mutate({ id: selectedKyc._id, status: 'VERIFIED' })}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-mono text-[11px]"
                >
                  Approve & Issue IDENTITY_VERIFIED Badge
                </button>
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVerificationDashboardPage;
