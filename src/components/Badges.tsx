import type { PatientPriority, ProcessingStatus } from '@/types';
import { AlertCircle, Clock, CheckCircle2, FileWarning, Loader, Upload } from 'lucide-react';

export function PriorityBadge({ priority }: { priority: PatientPriority }) {
  if (priority === 'urgent') return <span className="badge-urgent">URGENT</span>;
  if (priority === 'high') return <span className="badge-high">HIGH PRIORITY</span>;
  return <span className="badge-normal">Normal</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    registered: 'badge-neutral',
    in_progress: 'badge-info',
    completed: 'badge-success',
    reviewed: 'badge-warning',
    consulted: 'badge-success',
  };
  const labels: Record<string, string> = {
    registered: 'Registered',
    in_progress: 'In Progress',
    completed: 'Completed',
    reviewed: 'Reviewed',
    consulted: 'Consulted',
  };
  return <span className={styles[status] || 'badge-neutral'}>{labels[status] || status}</span>;
}

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  const config: Record<ProcessingStatus, { className: string; label: string; icon: React.ReactNode }> = {
    uploaded: { className: 'badge-neutral', label: 'Uploaded', icon: <Upload className="w-3 h-3" /> },
    processing: { className: 'badge-info', label: 'Processing', icon: <Loader className="w-3 h-3 animate-spin" /> },
    processed: { className: 'badge-success', label: 'Processed', icon: <CheckCircle2 className="w-3 h-3" /> },
    needs_review: { className: 'badge-warning', label: 'Needs Review', icon: <FileWarning className="w-3 h-3" /> },
    failed: { className: 'badge-error', label: 'Failed', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const c = config[status];
  return (
    <span className={c.className}>
      {c.icon}
      {c.label}
    </span>
  );
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'badge-warning',
    reviewed: 'badge-info',
    confirmed: 'badge-success',
    edited: 'badge-info',
  };
  const labels: Record<string, string> = {
    pending: 'Pending Review',
    reviewed: 'Reviewed',
    confirmed: 'Confirmed',
    edited: 'Edited',
  };
  return <span className={styles[status] || 'badge-neutral'}>{labels[status] || status}</span>;
}
