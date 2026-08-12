import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import { getAdminKycRequestsApi, reviewKycApi } from '../../services/adminService';
import type { IdentityKycData } from '../../types/admin';
import { IdCard, ShieldCheck, Lock, CheckCircle, XCircle } from 'lucide-react';

export const AdminAadhaarKycPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRecord, setSelectedRecord] = useState<IdentityKycData | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminKycRequests'],
    queryFn: () => getAdminKycRequestsApi(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reviewKycApi(id, status, reviewNotes),
    onSuccess: () => {
      setSelectedRecord(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminKycRequests'] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Compliance Banner */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center space-x-2 text-blue-400 font-heading font-semibold text-sm">
            <IdCard size={18} />
            <span>SYSTEM B — Aadhaar Paperless Offline e-KYC Identity Verification</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Official identity verification layer based on UIDAI digitally signed Offline XML.
            <span className="block text-emerald-400 mt-1 font-mono font-medium">
              PRIVACY COMPLIANCE ENFORCED: No raw XML, full Aadhaar numbers, OTPs, or biometrics are ever stored or displayed. Only masked reference IDs (e.g. XXXX-XXXX-1234) and digital signature match status are retained.
            </span>
          </p>
        </div>

        {/* KYC Table */}
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
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading Aadhaar e-KYC queue...</td>
                  </tr>
                ) : data?.records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No identity verification requests found.</td>
                  </tr>
                ) : (
                  data?.records.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white">{r.user?.name || 'User'}</td>
                      <td className="p-4 font-mono text-slate-300">
                        {r.referenceId || 'XXXX-XXXX-****'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                          r.signatureVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {r.signatureVerified ? 'VALID SIGNATURE ✓' : 'INVALID / UNCHECKED'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                          r.nameMatch ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {r.nameMatch ? 'MATCHED ✓' : 'UNMATCHED'}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge
                          status={r.status === ('VERIFIED' as any) ? 'Identity Verified' : r.status}
                          type={r.status === ('VERIFIED' as any) ? 'success' : 'warning'}
                        />
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700"
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

        {/* Modal */}
        {selectedRecord && (
          <AdminModal
            isOpen={!!selectedRecord}
            onClose={() => setSelectedRecord(null)}
            title={`Review Identity e-KYC: ${selectedRecord.user?.name}`}
          >
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-slate-400 font-mono">
                  <Lock size={14} className="text-emerald-400" />
                  <span>Isolated Identity Record (System B)</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 uppercase font-mono text-[10px]">Masked Reference</span>
                    <p className="font-mono text-slate-200 mt-0.5">{selectedRecord.referenceId || 'XXXX-XXXX-****'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-mono text-[10px]">Verification Type</span>
                    <p className="font-mono text-slate-200 mt-0.5">AADHAAR_OFFLINE_EKYC</p>
                  </div>
                </div>

                <textarea
                  placeholder="Enter admin review notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedRecord._id, status: 'RESUBMISSION_REQUIRED' })}
                  disabled={reviewMutation.isPending}
                  className="px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 font-mono text-[11px]"
                >
                  Request Resubmission
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedRecord._id, status: 'REJECTED' })}
                  disabled={reviewMutation.isPending}
                  className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 flex items-center space-x-1.5 font-mono text-[11px]"
                >
                  <XCircle size={15} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedRecord._id, status: 'VERIFIED' })}
                  disabled={reviewMutation.isPending}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 flex items-center space-x-1.5 font-mono text-[11px]"
                >
                  <CheckCircle size={15} />
                  <span>Approve & Issue IDENTITY_VERIFIED Badge</span>
                </button>
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};
