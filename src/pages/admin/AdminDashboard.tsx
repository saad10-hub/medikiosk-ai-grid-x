import { useState, useEffect } from 'react';
import { Users, FileText, AlertTriangle, FileCheck, TrendingUp, BarChart3, Activity, Clock } from 'lucide-react';
import { getAllPatients, getPatientsToday, getAuditLogs } from '@/services/patients';
import { getRedFlagAlerts } from '@/services/clinical-history';
import { getDocuments } from '@/services/documents';
import type { Patient, RedFlagAlert, AuditLog } from '@/types';

interface AdminDashboardProps {
  onSignOut: () => void;
}

export function AdminDashboard({ onSignOut }: AdminDashboardProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsToday, setPatientsToday] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<RedFlagAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [all, today, flagAlerts, logs] = await Promise.all([
          getAllPatients(),
          getPatientsToday(),
          getRedFlagAlerts(),
          getAuditLogs(30),
        ]);
        setPatients(all);
        setPatientsToday(today);
        setAlerts(flagAlerts || []);
        setAuditLogs(logs);

        // Count total documents
        let docCount = 0;
        for (const p of all) {
          try {
            const docs = await getDocuments(p.id);
            docCount += docs.length;
          } catch { /* skip */ }
        }
        setTotalDocs(docCount);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-neutral-500">Loading admin dashboard...</div>;
  }

  const completedHistories = patients.filter((p) => p.status === 'completed' || p.status === 'reviewed').length;
  const pendingReviews = patients.filter((p) => p.status === 'completed').length;
  const urgentCount = patients.filter((p) => p.priority === 'urgent').length;

  const stats = [
    { label: 'Total Patients', value: patients.length, icon: Users, color: 'bg-secondary-100 text-secondary-700' },
    { label: 'Patients Today', value: patientsToday.length, icon: TrendingUp, color: 'bg-primary-100 text-primary-700' },
    { label: 'Histories Completed', value: completedHistories, icon: FileCheck, color: 'bg-success-100 text-success-700' },
    { label: 'Documents Processed', value: totalDocs, icon: FileText, color: 'bg-accent-100 text-accent-700' },
    { label: 'Priority Alerts', value: alerts.filter((a) => !a.acknowledged).length, icon: AlertTriangle, color: 'bg-error-100 text-error-700' },
    { label: 'Pending Reviews', value: pendingReviews, icon: Clock, color: 'bg-warning-100 text-warning-700' },
  ];

  // Patients per day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const patientsPerDay = last7Days.map((d) => {
    const count = patients.filter((p) => {
      const pDate = new Date(p.created_at);
      return pDate.toDateString() === d.toDateString();
    }).length;
    return { date: d.toLocaleDateString('en-IN', { weekday: 'short' }), count };
  });
  const maxPatientsPerDay = Math.max(...patientsPerDay.map((d) => d.count), 1);

  // History completion rate
  const completionRate = patients.length > 0 ? Math.round((completedHistories / patients.length) * 100) : 0;

  // Document processing status breakdown
  const docStatusBreakdown = {
    processed: 0,
    processing: 0,
    needs_review: 0,
    failed: 0,
    uploaded: 0,
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="text-lg font-bold text-neutral-900">Admin Dashboard</h1>
            <p className="text-xs text-neutral-500">MediKiosk Hospital Analytics</p>
          </div>
        </div>
        <button onClick={onSignOut} className="btn-ghost text-sm">Sign Out</button>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Patients per day chart */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Patients Per Day (Last 7 Days)</h3>
            <div className="flex items-end justify-between gap-2 h-40">
              {patientsPerDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                      style={{ height: `${(d.count / maxPatientsPerDay) * 100}%`, minHeight: '4px' }}
                      title={`${d.count} patients`}
                    />
                  </div>
                  <span className="text-xs text-neutral-500">{d.date}</span>
                  <span className="text-xs font-medium text-neutral-700">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* History completion rate */}
          <div className="card p-5">
            <h3 className="section-title mb-4">History Completion Rate</h3>
            <div className="flex items-center justify-center h-40">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#2f9a7e" strokeWidth="10"
                    strokeDasharray={`${(completionRate / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-neutral-900">{completionRate}%</span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-neutral-500 mt-2">
              {completedHistories} of {patients.length} patients completed
            </p>
          </div>
        </div>

        {/* Priority alerts and audit logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Priority alerts */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-error-600" />
              <h3 className="section-title">Priority Alerts</h3>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-neutral-400">No priority alerts</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {alerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between bg-error-50 rounded-lg p-2">
                    <div>
                      <p className="text-sm text-error-700">{alert.flag_description}</p>
                      <p className="text-xs text-neutral-500">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                    {alert.acknowledged ? <span className="badge-success">Ack</span> : <span className="badge-error">New</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit logs */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-secondary-600" />
              <h3 className="section-title">Recent Activity</h3>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-neutral-400">No activity recorded</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-sm border-b border-neutral-100 pb-2">
                    <span className="badge-neutral capitalize">{log.actor_type}</span>
                    <span className="text-neutral-700 flex-1">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-neutral-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Patient table */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="section-title">All Patients ({patients.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Age</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3 hidden md:table-cell">Registered</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Priority</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {patients.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400">No patients yet</td></tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">{p.full_name}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{p.age || '-'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-500 hidden md:table-cell">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {p.priority === 'urgent' ? <span className="badge-urgent">URGENT</span> : p.priority === 'high' ? <span className="badge-high">HIGH</span> : <span className="badge-normal">Normal</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{p.status.replace('_', ' ')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
