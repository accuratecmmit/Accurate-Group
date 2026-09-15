import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMasterData } from '../../context/MasterDataContext';
import {
  fetchAssets,
  fetchCustomFields,
  downloadInventoryExcel,
  AssetCustomField,
} from '../../services/assetService';
import { fetchITTeams, ITTeam } from '../../services/itTeamService';
import { fetchAdminUsers } from '../../services/authService';
import { Asset } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ExcelImportModal } from './ExcelImportModal';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetFormModal } from './AssetFormModal';
import { CustomFieldsModal } from './CustomFieldsModal';
import {
  Laptop,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building,
  MapPin,
  Cpu,
  User,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Calendar,
  FileSpreadsheet,
  Download,
  Upload,
  Sliders,
  History,
  Archive,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const InventoryManagementView: React.FC = () => {
  const { user, profile, effectiveRole, isSuperAdmin } = useAuth();
  const {
    companies,
    locations,
    departments,
    activeCompanies,
    activeLocations,
    activeDepartments,
  } = useMasterData();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [itTeams, setItTeams] = useState<ITTeam[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<AssetCustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [includeRetired, setIncludeRetired] = useState(false);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Asset | null>(null);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

  const isEmployee = effectiveRole === 'EMPLOYEE';
  const isTechnician = effectiveRole === 'IT_TECHNICIAN';
  const isITAdmin = effectiveRole === 'IT_ADMIN';
  const canManage = isSuperAdmin || isITAdmin || isTechnician;

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [assetRes, teamRes, customFieldsRes] = await Promise.all([
        fetchAssets({ includeRetired }),
        fetchITTeams(),
        fetchCustomFields(),
      ]);

      if (assetRes.error) {
        setErrorMsg(assetRes.error);
      } else {
        setAssets(assetRes.assets || []);
      }

      setItTeams(teamRes.teams || []);
      setCustomFields(customFieldsRes.customFields || []);

      if (effectiveRole !== 'EMPLOYEE') {
        try {
          const userRes = await fetchAdminUsers();
          setEmployees(userRes.users || []);
        } catch {
          // non-critical
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load computer asset inventory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveRole, includeRetired]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      await downloadInventoryExcel();
      showSuccess('Inventory spreadsheet exported successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export inventory spreadsheet.');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered Assets
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.assignedUserName && a.assignedUserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.model && a.model.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || a.assetType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesLocation = locationFilter === 'ALL' || a.locationId === locationFilter;

    return matchesSearch && matchesType && matchesStatus && matchesLocation;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success">Active</Badge>;
      case 'Inactive':
        return <Badge variant="neutral">Inactive (Stock)</Badge>;
      case 'Under Repair':
        return <Badge variant="warning">Under Repair</Badge>;
      case 'Retired':
        return <Badge variant="danger">Retired</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Computer & IT Asset Inventory
            </h2>
            <Badge variant={isEmployee ? 'neutral' : isTechnician ? 'warning' : isITAdmin ? 'info' : 'purple'}>
              {effectiveRole} SCOPE
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEmployee && 'Viewing hardware computers and peripherals assigned exclusively to your profile.'}
            {isTechnician && 'Add and manage computers within your permitted IT Team scope. Single-employee assignment.'}
            {isITAdmin && 'Full hardware lifecycle control across your IT Team scope. Transfer ledger and status tracking.'}
            {isSuperAdmin && 'Organization-wide IT inventory across all locations and companies. Custom fields and Excel processing.'}
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={RefreshCw}
            disabled={isLoading}
            className="text-xs font-semibold rounded-xl"
          >
            Refresh
          </Button>

          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting || assets.length === 0}
                icon={Download}
                className="text-xs font-semibold rounded-xl"
              >
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
                icon={Upload}
                className="text-xs font-semibold rounded-xl border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                Import Excel
              </Button>

              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomFieldsModalOpen(true)}
                  icon={Sliders}
                  className="text-xs font-semibold rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  Custom Fields ({customFields.length})
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setAssetToEdit(null);
                  setIsAssetFormOpen(true);
                }}
                icon={Plus}
                className="text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-xs"
              >
                Register Asset
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Empty State with Excel Starter Callout */}
      {!isLoading && assets.length === 0 && canManage && (
        <div className="p-8 bg-gradient-to-br from-indigo-50/60 via-slate-50 to-emerald-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-emerald-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Initialize Organization Computer Inventory
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Start with the organization's existing Excel inventory workbook, or upload an updated file with full validation.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={Sparkles}
              onClick={() => setIsImportModalOpen(true)}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold"
            >
              Open Excel Workbook Importer
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => {
                setAssetToEdit(null);
                setIsAssetFormOpen(true);
              }}
              className="rounded-xl text-xs font-semibold"
            >
              Register Asset Manually
            </Button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tag, serial #, model, employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Hardware Types</option>
            <option value="LAPTOP">Laptop</option>
            <option value="DESKTOP">Desktop</option>
            <option value="WORKSTATION">Workstation</option>
            <option value="SERVER">Server</option>
            <option value="MONITOR">Monitor</option>
            <option value="NETWORK_DEVICE">Network Device</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active (In Service)</option>
            <option value="Inactive">Inactive (In Stock)</option>
            <option value="Under Repair">Under Repair</option>
            <option value="Retired">Retired</option>
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Locations</option>
            {activeLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Secondary Filter Flags: Include Retired Toggle & Count indicator */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredAssets.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{assets.length}</strong> computers
          </span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 font-medium">
          <input
            type="checkbox"
            checked={includeRetired}
            onChange={(e) => setIncludeRetired(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Include Retired Computers (Permanent History)</span>
        </label>
      </div>

      {/* Asset Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="text-xs">Loading computer inventory & assignment ledgers...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Laptop className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Computer Assets Found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {isEmployee
              ? 'You do not have any company hardware assets assigned to your profile.'
              : 'No computers match your search and filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const company = companies.find((c) => c.id === asset.companyId);
            const location = locations.find((l) => l.id === asset.locationId);

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAssetForDetail(asset)}
                className="group p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                        {asset.assetTag}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        &bull; {asset.assetType}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {asset.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1">
                    {getStatusBadge(asset.status)}
                    {canManage && asset.status !== 'Retired' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssetToEdit(asset);
                          setIsAssetFormOpen(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Asset"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Specs Box */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Manufacturer</span>
                    <span className="font-semibold truncate block">{asset.manufacturer || 'OEM'} {asset.model}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Serial Number</span>
                    <span className="font-mono text-[11px] font-semibold truncate block">{asset.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">CPU & RAM</span>
                    <span className="font-semibold truncate block">
                      {asset.specifications?.ramGb ? `${asset.specifications.ramGb}GB RAM` : 'Specs set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Operating System</span>
                    <span className="font-semibold truncate block">{asset.specifications?.os || 'Windows 11'}</span>
                  </div>
                </div>

                {/* Assignment & Location */}
                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {location?.name || 'Location N/A'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] truncate">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      {company?.code || 'CORP'}
                    </span>
                  </div>

                  {/* Single Employee Assignment Info */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="flex items-center gap-1.5 truncate">
                      <User className="w-3 h-3 text-indigo-500 shrink-0" />
                      {asset.assignedUserName ? (
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {asset.assignedUserName}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Unassigned (In Pool)</span>
                      )}
                    </span>

                    {asset.assignmentDate && (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(asset.assignmentDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {/* 1. Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={async () => {
          await loadData();
          showSuccess('Inventory updated from Excel workbook.');
        }}
      />

      {/* 2. Super Admin Custom Fields Modal */}
      <CustomFieldsModal
        isOpen={isCustomFieldsModalOpen}
        onClose={() => setIsCustomFieldsModalOpen(false)}
        onFieldsUpdated={loadData}
      />

      {/* 3. Asset Detail & Transfer Ledger Modal */}
      <AssetDetailModal
        asset={selectedAssetForDetail}
        isOpen={Boolean(selectedAssetForDetail)}
        onClose={() => setSelectedAssetForDetail(null)}
        onAssetUpdated={async () => {
          await loadData();
          if (selectedAssetForDetail) {
            const updated = assets.find((a) => a.id === selectedAssetForDetail.id);
            if (updated) setSelectedAssetForDetail(updated);
          }
        }}
        onEditClick={(asset) => {
          setSelectedAssetForDetail(null);
          setAssetToEdit(asset);
          setIsAssetFormOpen(true);
        }}
        canManage={canManage}
        employees={employees}
        customFields={customFields}
      />

      {/* 4. Asset Add / Edit Modal */}
      <AssetFormModal
        isOpen={isAssetFormOpen}
        onClose={() => {
          setIsAssetFormOpen(false);
          setAssetToEdit(null);
        }}
        onSaved={async () => {
          await loadData();
          showSuccess(assetToEdit ? 'Asset updated successfully.' : 'Asset registered successfully.');
        }}
        assetToEdit={assetToEdit}
        companies={activeCompanies}
        locations={activeLocations}
        departments={activeDepartments}
        itTeams={itTeams}
        employees={employees}
        customFields={customFields}
        isSuperAdmin={isSuperAdmin}
        currentUserTeamId={profile?.itTeamId}
      />
    </div>
  );
};
