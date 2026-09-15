import React, { useState } from 'react';
import { Asset, AssetAssignmentRecord, AssetCustomField } from '../../types';
import { updateAsset, deleteOrRetireAsset } from '../../services/assetService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Laptop,
  User,
  MapPin,
  Building,
  Calendar,
  Clock,
  HardDrive,
  Cpu,
  Shield,
  Edit2,
  UserCheck,
  UserMinus,
  Archive,
  History,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
} from 'lucide-react';

interface AssetDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onAssetUpdated: () => void;
  onEditClick: (asset: Asset) => void;
  canManage: boolean;
  employees: any[];
  customFields: AssetCustomField[];
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  isOpen,
  onClose,
  onAssetUpdated,
  onEditClick,
  canManage,
  employees,
  customFields,
}) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY' | 'TRANSFER'>('DETAILS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transfer state
  const [transferTargetUserId, setTransferTargetUserId] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Retire confirm dialog
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);

  if (!isOpen || !asset) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success">Active</Badge>;
      case 'Inactive':
        return <Badge variant="neutral">Inactive (In Stock)</Badge>;
      case 'Under Repair':
        return <Badge variant="warning">Under Repair</Badge>;
      case 'Retired':
        return <Badge variant="danger">Retired (Preserved)</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const handleTransferOrReturn = async (returnToPool = false) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        assignedUserId: returnToPool ? null : transferTargetUserId || null,
        transferNotes: transferNotes.trim() || undefined,
        status: returnToPool ? 'Inactive' : 'Active',
      };

      const res = await updateAsset(asset.id, payload);
      if (res.success && res.asset) {
        setSuccessMsg(
          returnToPool
            ? 'Computer returned to inventory stock pool. Transfer ledger updated.'
            : `Computer successfully transferred. Assignment history updated.`
        );
        setTransferTargetUserId('');
        setTransferNotes('');
        onAssetUpdated();
        setActiveTab('HISTORY');
      } else {
        setErrorMsg(res.error || 'Failed to update assignment.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetireAsset = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await deleteOrRetireAsset(asset.id);
      if (res.success) {
        setShowRetireConfirm(false);
        setSuccessMsg(res.message || 'Asset retired. History permanently preserved.');
        onAssetUpdated();
      } else {
        setErrorMsg(res.error || 'Failed to retire asset.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error retiring asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const historyRecords = (asset.assignmentHistory || []).slice().reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 space-y-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                {asset.assetTag}
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                S/N: {asset.serialNumber}
              </span>
              {getStatusBadge(asset.status)}
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">
              {asset.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {asset.manufacturer} {asset.model} &bull; {asset.assetType}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && asset.status !== 'Retired' && (
              <Button
                variant="outline"
                size="sm"
                icon={Edit2}
                onClick={() => onEditClick(asset)}
                className="rounded-xl text-xs font-semibold"
              >
                Edit Asset
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              activeTab === 'DETAILS'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview & Specifications
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Assignment History Ledger ({historyRecords.length})
          </button>
          {canManage && asset.status !== 'Retired' && (
            <button
              onClick={() => setActiveTab('TRANSFER')}
              className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
                activeTab === 'TRANSFER'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Transfer / Return
            </button>
          )}
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: DETAILS */}
          {activeTab === 'DETAILS' && (
            <div className="space-y-4">
              {/* Assignment Status Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-500" />
                    Current Employee Assignment (Strict 1-to-1 Rule)
                  </span>
                  {asset.assignedUserName ? (
                    <Badge variant="success">Currently Assigned</Badge>
                  ) : (
                    <Badge variant="neutral">In Inventory Pool</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Employee</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {asset.assignedUserName || 'None (In Stock)'}
                    </span>
                    {asset.assignedUserEmail && (
                      <span className="text-[11px] text-slate-400 block">{asset.assignedUserEmail}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Assignment Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {asset.assignmentDate
                        ? new Date(asset.assignmentDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Previous Employee</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {asset.previousEmployeeName || 'No previous recorded user'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Transfer Date</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {asset.transferDate
                        ? new Date(asset.transferDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hardware Specifications Grid */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  Hardware Specifications
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Processor / CPU</span>
                    <span className="font-semibold">{asset.specifications.cpu || 'Standard Processor'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">RAM Memory</span>
                    <span className="font-semibold">{asset.specifications.ramGb ? `${asset.specifications.ramGb} GB` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Storage Capacity</span>
                    <span className="font-semibold">
                      {asset.specifications.storageGb ? `${asset.specifications.storageGb} GB ${asset.specifications.storageType || 'SSD'}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Operating System</span>
                    <span className="font-semibold">{asset.specifications.os || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">MAC Address</span>
                    <span className="font-mono text-[11px]">{asset.specifications.macAddress || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">IP Address</span>
                    <span className="font-mono text-[11px]">{asset.specifications.ipAddress || 'DHCP / Dynamic'}</span>
                  </div>
                </div>
              </div>

              {/* Financial, Master Data & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Financial & Lifecycle</span>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Purchase Cost</span>
                    <span className="font-semibold">{asset.purchaseCost ? `$${asset.purchaseCost.toLocaleString()}` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Purchase Date</span>
                    <span>{asset.purchaseDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Warranty Expiry</span>
                    <span>{asset.warrantyExpiryDate || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Notes & Annotations</span>
                  <p className="text-slate-600 dark:text-slate-300 italic">
                    {asset.notes || 'No administrative notes recorded for this computer.'}
                  </p>
                </div>
              </div>

              {/* Custom Fields Extensibility */}
              {customFields.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Super Admin Custom Fields
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {customFields.map((cf) => {
                      const val = asset.customFields ? asset.customFields[cf.fieldKey] : undefined;
                      return (
                        <div key={cf.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            {cf.label}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {val !== undefined && val !== null && val !== ''
                              ? typeof val === 'boolean'
                                ? val ? 'Yes' : 'No'
                                : String(val)
                              : <span className="text-slate-400 italic">Not set</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSIGNMENT HISTORY LEDGER */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  Chronological assignment audit trail preserving employee transfers, initial allocations, and stock returns.
                </span>
              </div>

              {historyRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                  No historical assignment transactions recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={rec.action === 'INITIAL_ASSIGNMENT' ? 'success' : rec.action === 'TRANSFER' ? 'purple' : rec.action === 'STATUS_CHANGE' ? 'danger' : 'neutral'}>
                            {rec.action.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(rec.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Logged by: {rec.assignedByUserName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                        {rec.previousEmployeeName ? (
                          <>
                            <span className="text-slate-500">{rec.previousEmployeeName}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </>
                        ) : null}
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {rec.currentEmployeeName || 'Returned to Stock Pool'}
                        </span>
                      </div>

                      {rec.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          &ldquo;{rec.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSFER / RETURN CONTROLS */}
          {activeTab === 'TRANSFER' && canManage && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Reassign Computer to Another Employee (Strict 1-to-1 Rule)
                </span>
                <p className="text-xs text-slate-500">
                  Assigning to a new employee automatically preserves the previous user in the transfer ledger.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Employee *
                    </label>
                    <select
                      value={transferTargetUserId}
                      onChange={(e) => setTransferTargetUserId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    >
                      <option value="">-- Select Employee --</option>
                      {employees
                        .filter((emp) => emp.id !== asset.assignedUserId)
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.displayName} ({emp.email}) - {emp.departmentName || 'General'}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Transfer Reason / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Department transfer, replacement hardware, project rotation"
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting || !transferTargetUserId}
                      onClick={() => handleTransferOrReturn(false)}
                      className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold"
                    >
                      {isSubmitting ? 'Transferring...' : 'Execute Employee Transfer'}
                    </Button>

                    {asset.assignedUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleTransferOrReturn(true)}
                        className="rounded-xl text-xs font-semibold text-slate-700"
                      >
                        Return to Stock Pool (Unassign)
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Retire Section (Never Permanently Delete) */}
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 space-y-2">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">
                  Retire Asset From Corporate Service
                </span>
                <p className="text-xs text-rose-700/80 dark:text-rose-300/70">
                  In accordance with organizational compliance, computer records are <strong>never permanently deleted</strong>. Retiring marks the asset status as &ldquo;Retired&rdquo; while keeping all specifications, audit logs, and employee transfer history completely intact.
                </p>

                {showRetireConfirm ? (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-300 dark:border-rose-800 space-y-2">
                    <p className="text-xs font-bold text-rose-700">
                      Confirm retiring asset {asset.assetTag}?
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={handleRetireAsset}
                        className="rounded-xl text-xs font-semibold"
                      >
                        Yes, Mark as Retired
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRetireConfirm(false)}
                        className="rounded-xl text-xs font-semibold"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Archive}
                    onClick={() => setShowRetireConfirm(true)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    Retire Asset (Preserve History)
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-semibold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
