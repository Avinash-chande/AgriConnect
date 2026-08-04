import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  LogOut,
  Ban,
  Briefcase,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import type { JobApplication, ApplicationStatus } from '../../types/application';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface TimelineStep {
  key: ApplicationStatus | 'Applied';
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
  textColor: string;
  badgeBg: string;
  isTerminal: boolean;
  isNegative?: boolean;
}

interface ApplicationStatusTimelineProps {
  application: JobApplication;
  compact?: boolean;
}

// ─────────────────────────────────────────────
// Timeline Step Definitions
// ─────────────────────────────────────────────
const ALL_STEPS: TimelineStep[] = [
  {
    key: 'Applied',
    label: 'Applied',
    description: 'Application submitted to the farmer',
    icon: Send,
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    ringColor: 'ring-indigo-400',
    textColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-100',
    isTerminal: false,
  },
  {
    key: 'Pending',
    label: 'Under Review',
    description: 'Farmer is reviewing your application',
    icon: Clock,
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    ringColor: 'ring-amber-400',
    textColor: 'text-amber-700',
    badgeBg: 'bg-amber-100',
    isTerminal: false,
  },
  {
    key: 'Shortlisted',
    label: 'Shortlisted',
    description: 'Your profile caught the farmer\'s attention',
    icon: Star,
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    ringColor: 'ring-blue-400',
    textColor: 'text-blue-700',
    badgeBg: 'bg-blue-100',
    isTerminal: false,
  },
  {
    key: 'Accepted',
    label: 'Accepted',
    description: 'Farmer has accepted your application',
    icon: CheckCircle2,
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    ringColor: 'ring-emerald-400',
    textColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-100',
    isTerminal: false,
  },
  {
    key: 'Hired',
    label: 'Hired 🎉',
    description: 'Congratulations! You have been hired',
    icon: Briefcase,
    color: '#059669',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-400',
    ringColor: 'ring-emerald-500',
    textColor: 'text-emerald-800',
    badgeBg: 'bg-emerald-200',
    isTerminal: true,
  },
];

const NEGATIVE_STEPS: Record<string, TimelineStep> = {
  Rejected: {
    key: 'Rejected',
    label: 'Not Selected',
    description: 'Farmer did not proceed with your application',
    icon: XCircle,
    color: '#EF4444',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    ringColor: 'ring-rose-400',
    textColor: 'text-rose-700',
    badgeBg: 'bg-rose-100',
    isTerminal: true,
    isNegative: true,
  },
  Withdrawn: {
    key: 'Withdrawn',
    label: 'Withdrawn',
    description: 'You withdrew this application',
    icon: LogOut,
    color: '#6B7280',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    ringColor: 'ring-slate-400',
    textColor: 'text-slate-600',
    badgeBg: 'bg-slate-100',
    isTerminal: true,
    isNegative: true,
  },
  Cancelled: {
    key: 'Cancelled',
    label: 'Hiring Cancelled',
    description: 'The farmer cancelled the hiring arrangement',
    icon: Ban,
    color: '#D97706',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    ringColor: 'ring-amber-400',
    textColor: 'text-amber-800',
    badgeBg: 'bg-amber-100',
    isTerminal: true,
    isNegative: true,
  },
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const STATUS_ORDER: Array<ApplicationStatus | 'Applied'> = [
  'Applied',
  'Pending',
  'Shortlisted',
  'Accepted',
  'Hired',
];

function getVisibleSteps(status: ApplicationStatus): TimelineStep[] {
  if (status === 'Rejected' || status === 'Withdrawn' || status === 'Cancelled') {
    // Show positive progress up to Pending, then the terminal negative step
    return [ALL_STEPS[0], ALL_STEPS[1], NEGATIVE_STEPS[status]];
  }
  // For Shortlisted show up to Shortlisted, for Accepted up to Accepted, for Hired all
  const stepIndex = STATUS_ORDER.indexOf(status as any);
  return ALL_STEPS.slice(0, Math.max(stepIndex + 1, 2));
}

function getStepDate(step: TimelineStep, app: JobApplication): string | null {
  if (step.key === 'Applied') return app.createdAt;
  if (step.key === 'Hired') return app.hiredDate || null;
  if (step.key === 'Rejected') return app.rejectedDate || null;
  if (step.key === 'Withdrawn') return app.withdrawnDate || null;
  if (step.key === 'Cancelled') return app.cancelledDate || null;
  return null;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isStepCompleted(stepKey: string, currentStatus: ApplicationStatus): boolean {
  const negativeTerminals = ['Rejected', 'Withdrawn', 'Cancelled'];
  if (negativeTerminals.includes(stepKey)) return currentStatus === stepKey;
  if (stepKey === 'Applied') return true;
  const currentIdx = STATUS_ORDER.indexOf(currentStatus as any);
  const stepIdx = STATUS_ORDER.indexOf(stepKey as any);
  return stepIdx <= currentIdx;
}

function isCurrentStep(stepKey: string, status: ApplicationStatus): boolean {
  if (stepKey === 'Applied' && status === 'Pending') return false;
  if (stepKey === 'Applied') return status === 'Applied';
  return stepKey === status;
}

// ─────────────────────────────────────────────
// Animated Dot Component
// ─────────────────────────────────────────────
const PulseDot: React.FC<{ color: string }> = ({ color }) => (
  <span className="relative flex h-3 w-3">
    <span
      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
      style={{ backgroundColor: color }}
    />
    <span
      className="relative inline-flex rounded-full h-3 w-3"
      style={{ backgroundColor: color }}
    />
  </span>
);

// ─────────────────────────────────────────────
// Timeline Step Node
// ─────────────────────────────────────────────
interface StepNodeProps {
  step: TimelineStep;
  isCompleted: boolean;
  isActive: boolean;
  isLast: boolean;
  date: string | null;
  compact: boolean;
  index: number;
}

const StepNode: React.FC<StepNodeProps> = ({
  step,
  isCompleted,
  isActive,
  isLast,
  date,
  compact,
  index,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 120);
    return () => clearTimeout(timer);
  }, [index]);

  const IconComp = step.icon;

  return (
    <div
      ref={nodeRef}
      className={`flex gap-4 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* Icon Column */}
      <div className="flex flex-col items-center">
        {/* Circle Icon */}
        <div
          className={`
            relative flex items-center justify-center rounded-full transition-all duration-300 shrink-0
            ${compact ? 'w-9 h-9' : 'w-11 h-11'}
            ${isCompleted
              ? `${step.bgColor} ring-2 ${step.ringColor} shadow-sm`
              : 'bg-slate-100 ring-2 ring-slate-200'
            }
            ${isActive ? 'shadow-md scale-110' : ''}
          `}
        >
          <IconComp
            className={`transition-colors duration-300 ${compact ? 'w-4 h-4' : 'w-5 h-5'} ${
              isCompleted ? step.textColor : 'text-slate-400'
            }`}
          />
          {isActive && (
            <span className="absolute -top-0.5 -right-0.5">
              <PulseDot color={step.color} />
            </span>
          )}
        </div>

        {/* Connector Line */}
        {!isLast && (
          <div className={`w-0.5 flex-1 mt-1.5 mb-1.5 min-h-[28px] rounded-full transition-colors duration-500 ${
            isCompleted ? 'bg-gradient-to-b from-slate-300 to-slate-200' : 'bg-slate-100'
          }`} />
        )}
      </div>

      {/* Content Column */}
      <div className={`${isLast ? 'pb-0' : 'pb-5'} min-w-0 flex-1`}>
        <div className={`flex flex-wrap items-center gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
          {/* Label */}
          <span
            className={`font-semibold leading-tight transition-colors duration-300 ${
              compact ? 'text-sm' : 'text-base'
            } ${isCompleted ? step.textColor : 'text-slate-400'}`}
          >
            {step.label}
          </span>

          {/* Active Badge */}
          {isActive && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${step.badgeBg} ${step.textColor}`}
            >
              Current
            </span>
          )}
        </div>

        {/* Description */}
        {!compact && (
          <p className={`text-xs leading-relaxed transition-colors duration-300 ${
            isCompleted ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {step.description}
          </p>
        )}

        {/* Date */}
        {date && (
          <div className={`flex items-center gap-1 mt-1 ${compact ? '' : 'mt-1.5'}`}>
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] text-slate-500 font-medium">{formatDate(date)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Progress Bar
// ─────────────────────────────────────────────
const ProgressBar: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const negativeTerminals = ['Rejected', 'Withdrawn', 'Cancelled'];
  const isNegative = negativeTerminals.includes(status);

  const progressMap: Record<string, number> = {
    Applied: 5,
    Pending: 25,
    Shortlisted: 50,
    Accepted: 72,
    Hired: 100,
    Rejected: 25,
    Withdrawn: 25,
    Cancelled: 72,
  };

  const pct = progressMap[status] ?? 25;
  const barColor = isNegative
    ? status === 'Cancelled'
      ? '#D97706'
      : status === 'Rejected'
      ? '#EF4444'
      : '#6B7280'
    : '#10B981';

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Application Progress
        </span>
        <span
          className="text-xs font-bold"
          style={{ color: barColor }}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            background: isNegative
              ? barColor
              : `linear-gradient(90deg, #6EE7B7, ${barColor})`,
          }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Feedback Banner
// ─────────────────────────────────────────────
const FeedbackBanner: React.FC<{ application: JobApplication }> = ({ application }) => {
  if (!application.farmerFeedback) return null;

  const status = application.status;
  const bannerStyles: Record<string, { bg: string; border: string; icon: string }> = {
    Rejected: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-500' },
    Accepted: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500' },
    Hired: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500' },
    Cancelled: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
    default: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500' },
  };
  const style = bannerStyles[status] || bannerStyles.default;

  return (
    <div className={`mt-4 p-3 rounded-xl border ${style.bg} ${style.border}`}>
      <p className="text-xs font-semibold text-slate-500 mb-1">Farmer's Note</p>
      <p className={`text-sm italic text-slate-700`}>"{application.farmerFeedback}"</p>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export const ApplicationStatusTimeline: React.FC<ApplicationStatusTimelineProps> = ({
  application,
  compact = false,
}) => {
  const { status, job } = application;
  const steps = getVisibleSteps(status);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-white px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Application Status
            </p>
            <h3 className="text-base font-bold text-slate-900 truncate leading-tight">
              {job?.title || 'Job Application'}
            </h3>
            {job?.category && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {job.category}
                {job.jobAddress?.district && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    {job.jobAddress.district}
                  </>
                )}
              </p>
            )}
          </div>

          {/* Status Pill */}
          {(() => {
            const currentStep =
              steps.find((s) => s.key === status) ||
              (NEGATIVE_STEPS[status] ? NEGATIVE_STEPS[status] : ALL_STEPS[0]);
            return (
              <span
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${currentStep.badgeBg} ${currentStep.textColor} ${currentStep.borderColor}`}
              >
                {currentStep.label}
              </span>
            );
          })()}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <ProgressBar status={status} />
        </div>
      </div>

      {/* Timeline */}
      <div className={`px-5 ${compact ? 'pt-4 pb-4' : 'pt-5 pb-5'}`}>
        <div>
          {steps.map((step, idx) => {
            const completed = isStepCompleted(step.key as string, status);
            const active = isCurrentStep(step.key as string, status) || step.key === status;
            const date = getStepDate(step, application);

            return (
              <StepNode
                key={step.key}
                step={step}
                isCompleted={completed}
                isActive={active}
                isLast={idx === steps.length - 1}
                date={date}
                compact={compact}
                index={idx}
              />
            );
          })}
        </div>

        {/* Farmer Feedback */}
        <FeedbackBanner application={application} />
      </div>
    </div>
  );
};

export default ApplicationStatusTimeline;
