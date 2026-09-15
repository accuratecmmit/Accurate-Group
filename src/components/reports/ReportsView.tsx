import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStoredToken } from '../../services/authService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  BarChart3,
  Download,
  RefreshCw,
  Ticket,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Shield,
  Clock,
} from 'lucide-react';

interface ReportSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  urgentTickets: number;
  byCategory: Record<string, number>;
  totalAssets: number;
  assignedAssets: number;
  inStockAssets: number;
  scopeTeam: string;
}

export const ReportsView: React.FC = () => {
  const { user, profile, effectiveRole, isSuperAdmin } = useAuth();

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isITAdmin = effectiveRole === 'IT_ADMIN';

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/reports/tickets-summary', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to generate report');
      } else {
        setSummary(data.summary);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Report network error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [effectiveRole]);

  // Export report as JSON/CSV
  const handleExportJSON = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `it_report_${summary.scopeTeam.toLowerCase()}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!summary) return;
    let csv = `Metric,Value\n`;
    csv += `Report Scope,${summary.scopeTeam}\n`;
    csv += `Total Tickets,${summary.totalTickets}\n`;
    csv += `Open Tickets,${summary.openTickets}\n`;
    csv += `Resolved Tickets,${summary.resolvedTickets}\n`;
    csv += `Urgent Tickets,${summary.urgentTickets}\n`;
    csv += `Hardware Issues,${summary.byCategory.HARDWARE || 0}\n`;
    csv += `Software Issues,${summary.byCategory.SOFTWARE || 0}\n`;
    csv += `Network Issues,${summary.byCategory.NETWORK || 0}\n`;
    csv += `Access Requests,${summary.byCategory.ACCESS || 0}\n`;
    csv += `Total Assets,${summary.totalAssets}\n`;
    csv += `Assigned Assets,${summary.assignedAssets}\n`;
    csv += `In-Stock Assets,${summary.inStockAssets}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `it_report_${summary.scopeTeam.toLowerCase()}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (effectiveRole !== 'IT_ADMIN' && effectiveRole !== 'SUPER_ADMIN') {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Access Restricted
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Report generation and data export are reserved for IT Administrators and Super Administrators according to the corporate RBAC model.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Operational Analytics & Reports
            </h2>
            <Badge variant={isSuperAdmin ? 'purple' : 'info'}>
              {summary ? `SCOPE: ${summary.scopeTeam}` : 'GENERATING...'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Organization-wide consolidated intelligence across all IT teams, facilities, and inventories.'
              : `Operational statistics and queue performance scoped strictly to ${profile?.itTeamName || profile?.itTeamId}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadReport}
            icon={RefreshCw}
            disabled={isLoading}
            className="text-xs font-semibold rounded-xl"
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={!summary}
            icon={FileSpreadsheet}
            className="text-xs font-semibold rounded-xl"
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportJSON}
            disabled={!summary}
            icon={Download}
            className="text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-xs"
          >
            Export JSON
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="text-xs">Generating scoped report data...</p>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Tickets
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                  {summary.totalTickets}
                </span>
                <Ticket className="w-5 h-5 text-indigo-500" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Open / In-Progress
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                  {summary.openTickets}
                </span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Resolved / Closed
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {summary.resolvedTickets}
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Urgent Priority
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {summary.urgentTickets}
                </span>
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                Ticket Distribution by Category
              </h3>

              <div className="space-y-3 pt-1">
                {Object.entries(summary.byCategory).map(([cat, count]) => {
                  const numCount = Number(count) || 0;
                  const percent = summary.totalTickets > 0 ? Math.round((numCount / summary.totalTickets) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                        <span>{cat}</span>
                        <span className="font-mono text-slate-500">
                          {numCount} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hardware Asset Pool Health */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-teal-500" />
                Scoped Hardware Inventory Breakdown
              </h3>

              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pool</span>
                    <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200">
                      {summary.totalAssets}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Assigned</span>
                    <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300">
                      {summary.assignedAssets}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">In Stock</span>
                    <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                      {summary.inStockAssets}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Inventory Allocation Ratio:
                  </p>
                  <p>
                    {summary.totalAssets > 0
                      ? `${Math.round((summary.assignedAssets / summary.totalAssets) * 100)}% of equipment currently deployed to employees.`
                      : 'No hardware assets allocated in current scope.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
