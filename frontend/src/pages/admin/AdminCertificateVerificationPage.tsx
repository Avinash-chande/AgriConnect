import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import { getAdminCertificatesApi, reviewCertificateApi } from '../../services/adminService';
import type { CertificateData } from '../../types/admin';
import {
  Award,
  ExternalLink,
  CheckCircle,
  XCircle,
  RotateCcw,
  ShieldAlert,
  FileText,
  Filter,
} from 'lucide-react';

const CERT_TYPE_LABELS: Record<string, string> = {
  AGRICULTURAL: 'Agricultural',
  TRAINING: 'Training',
  TRACTOR_OPERATOR: 'Tractor / Operator',
  EQUIPMENT_TRAINING: 'Equipment Operator',
  ITI_CERTIFICATE: 'ITI Certificate',
  GOVERNMENT_SKILL: 'Government Skill',
  OTHER: 'Other',
};

export const AdminCertificateVerificationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminCertificates', statusFilter, typeFilter],
    queryFn: () => getAdminCertificatesApi({ status: statusFilter, certificateType: typeFilter }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUESTED' }) =>
      reviewCertificateApi(id, status, reviewNotes),
    onSuccess: () => {
      setSelectedCert(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminCertificates'] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Compliance Warning Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start space-x-3 text-amber-300 text-xs">
          <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-200">
              System A — Skill Certificate Verification Compliance Rule
            </p>
            <p className="text-amber-300/80 leading-relaxed">
              Skill certificate verification evaluates technical qualifications and training credentials only.
              It does <strong>NOT</strong> constitute government identity verification. All private document accesses are recorded in security audit logs.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-mono">
            <Filter size={14} />
            <span>Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RESUBMISSION_REQUESTED">Resubmission Requested</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Certificate Types</option>
            {Object.entries(CERT_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Certificate Review Queue Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award size={18} className="text-amber-400" />
              <h3 className="text-sm font-heading font-semibold text-white">Skill Certificate Review Queue</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: {data?.pagination?.total || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-4">User / Worker</th>
                  <th className="p-4">Certificate Title</th>
                  <th className="p-4">Issuer</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Private Document</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Loading certificate review queue...</td>
                  </tr>
                ) : !(data?.certificates || (data as any)?.records) || (data?.certificates || (data as any)?.records).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">No skill certificates matching query criteria.</td>
                  </tr>
                ) : (
                  (data?.certificates || (data as any)?.records).map((c: CertificateData) => (
                    <tr key={c._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-white">{c.user?.name || 'Worker'}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{c.user?.email || c.user?.mobile}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-200 font-medium">{c.title}</p>
                        {c.certificateNumber && (
                          <p className="text-[11px] text-slate-500 font-mono">No: {c.certificateNumber}</p>
                        )}
                      </td>
                      <td className="p-4 text-slate-400">{c.issuer || 'N/A'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 text-[11px] uppercase font-mono">
                          {CERT_TYPE_LABELS[c.certificateType] || c.certificateType}
                        </span>
                      </td>
                      <td className="p-4">
                        <a
                          href={c.documentReference}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-emerald-400 hover:underline font-mono text-[11px]"
                        >
                          <FileText size={12} />
                          <span>View Doc</span>
                          <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCert(c);
                            setReviewNotes(c.reviewNotes || '');
                          }}
                          className="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-mono text-[11px]"
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

        {/* Review Modal */}
        {selectedCert && (
          <AdminModal
            isOpen={!!selectedCert}
            onClose={() => setSelectedCert(null)}
            title={`Review Certificate: ${selectedCert.title}`}
          >
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-300">
                      Submitted by: <strong className="text-white">{selectedCert.user?.name}</strong> ({selectedCert.user?.email})
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Issuer: {selectedCert.issuer || 'N/A'} | Number: {selectedCert.certificateNumber || 'N/A'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 text-[10px] uppercase font-mono">
                    {CERT_TYPE_LABELS[selectedCert.certificateType] || selectedCert.certificateType}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] text-amber-300/80 flex items-center space-x-2">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span>
                    Note: Approving awards <strong>SKILL_VERIFIED</strong> badge and updates System A Trust Score.
                  </span>
                </div>

                <div className="pt-2">
                  <label className="block text-slate-400 font-mono text-[11px] mb-1">
                    Review Notes / Resubmission Reason:
                  </label>
                  <textarea
                    placeholder="Provide notes for approval, rejection, or resubmission instructions..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedCert._id, status: 'RESUBMISSION_REQUESTED' })}
                  disabled={reviewMutation.isPending}
                  className="px-3 py-2 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 flex items-center space-x-1 font-mono text-[11px]"
                >
                  <RotateCcw size={14} />
                  <span>Request Resubmission</span>
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedCert._id, status: 'REJECTED' })}
                  disabled={reviewMutation.isPending}
                  className="px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 flex items-center space-x-1 font-mono text-[11px]"
                >
                  <XCircle size={14} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedCert._id, status: 'APPROVED' })}
                  disabled={reviewMutation.isPending}
                  className="px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 flex items-center space-x-1 font-mono text-[11px]"
                >
                  <CheckCircle size={14} />
                  <span>Approve & Award Badge</span>
                </button>
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};
