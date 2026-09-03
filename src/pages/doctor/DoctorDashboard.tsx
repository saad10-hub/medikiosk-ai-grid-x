import { useState, useEffect } from 'react';
import { Users, AlertTriangle, FileCheck, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { getAllPatients, getPatientsToday, getUrgentPatients } from '@/services/patients';
import { getRedFlagAlerts } from '@/services/clinical-history';
import { getClinicalSummary } from '@/services/clinical-history';
import type { Patient, RedFlagAlert } from '@/types';

interface DoctorDashboardProps {
  doctorId: string;
  doctorName: string;
  onViewPatient: (patientId: string) => void;
}

export function DoctorDashboard({ doctorName, onViewPatient }: DoctorDashboardProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsToday, setPatientsToday] = useState<Patient[]>([]);
  const [urgentPatients, setUrgentPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<RedFlagAlert[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [all, today, urgent, flagAlerts] = await Promise.all([
          getAllPatients(),
          getPatientsToday(),
          getUrgentPatients(),
          getRedFlagAlerts(),
        ]);
        setPatients(all);
        setPatientsToday(today);
        setUrgentPatients(urgent);
        setAlerts(flagAlerts || []);
        setCompletedCount(all.filter((p) => p.status === 'completed' || p.status === 'reviewed').length);
        setPendingCount(all.filter((p) => p.status === 'completed').length);

        // Check which patients have summaries
        for (const p of all) {
          if (p.status === 'completed') {
            getClinicalSummary(p.id).then((summary) => {
              if (summary?.is_verified) {
                setPendingCount((prev) => Math.max(0, prev - 1));
              }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: 'Patients Today', value: patientsToday.length, icon: Users, color: 'bg-secondary-100 text-secondary-700' },
    { label: 'Completed Histories', value: completedCount, icon: FileCheck, color: 'bg-success-100 text-success-700' },
    { label: 'Pending Reviews', value: pendingCount, icon: Clock, color: 'bg-warning-100 text-warning-700' },
    { label: 'Priority Alerts', value: alerts.filter((a) => !a.acknowledged).length, icon: AlertTriangle, color: 'bg-error-100 text-error-700' },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-sm text-neutral-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Welcome, {doctorName}</h1>
        <p className="text-sm text-neutral-500 mt-1">Here's your OPD overview for today</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
              <p className="text-sm text-neutral-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Priority alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-error-600" />
            <h2 className="section-title">Priority Alerts</h2>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="card p-4 border-l-4 border-l-error-500 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{alert.flag_description}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {new Date(alert.created_at).toLocaleString()} • Severity: {alert.severity}
                  </p>
                </div>
                {alert.acknowledged ? (
                  <span className="badge-success">Acknowledged</span>
                ) : (
                  <span className="badge-error">Unacknowledged</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h2 className="section-title">All Patients ({patients.length})</h2>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Patient Name</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Age</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Chief Complaint</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Priority</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">No patients yet</td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-neutral-900">{patient.full_name}</p>
                        <p className="text-xs text-neutral-400">{patient.gender}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{patient.age || '-'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600 hidden md:table-cell max-w-xs truncate">
                        {patient.status === 'registered' ? '-' : 'History completed'}
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={patient.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={patient.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onViewPatient(patient.id)}
                          className="btn-ghost text-primary-600 text-sm"
                        >
                          View <ChevronRight className="w-4 h-4" />
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
    </div>
  );
}
