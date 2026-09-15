import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Briefcase,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Globe,
  Mail,
  Clock,
  ShieldCheck,
  Filter,
  History,
  Ticket,
  Laptop,
  Users,
  AlertCircle,
} from 'lucide-react';
import { useMasterData } from '../../context/MasterDataContext';
import { useAuth } from '../../context/AuthContext';
import { Company, Location, Department } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export const MasterDataManager: React.FC = () => {
  const {
    companies,
    locations,
    departments,
    isLoading,
    refreshMasterData,
    addCompany,
    editCompany,
    archiveCompany,
    restoreCompany,
    addLocation,
    editLocation,
    archiveLocation,
    restoreLocation,
    addDepartment,
    editDepartment,
    archiveDepartment,
    restoreDepartment,
  } = useMasterData();

  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'companies' | 'locations' | 'departments'>('companies');
  const [showArchived, setShowArchived] = useState<boolean>(true);

  // Company modal state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    code: '',
    name: '',
    domain: '',
    contactEmail: '',
    status: 'ACTIVE' as Company['status'],
  });

  // Location modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    country: '',
    timezone: 'UTC',
    status: 'ACTIVE' as Location['status'],
  });

  // Department modal state
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    code: '',
    name: '',
    description: '',
    status: 'ACTIVE' as Department['status'],
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const displayMessage = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionSuccess(null);
    } else {
      setActionSuccess(msg);
      setActionError(null);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // ---------------------------------------------
  // Filtered lists (Archived toggle)
  // ---------------------------------------------
  const filteredCompanies = companies.filter((c) => (showArchived ? true : !c.isArchived && c.status === 'ACTIVE'));
  const filteredLocations = locations.filter((l) => (showArchived ? true : !l.isArchived && l.status === 'ACTIVE'));
  const filteredDepartments = departments.filter((d) => (showArchived ? true : !d.isArchived && d.status === 'ACTIVE'));

  // ---------------------------------------------
  // Company Handlers
  // ---------------------------------------------
  const handleOpenCreateCompany = () => {
    setEditingCompany(null);
    setCompanyForm({
      code: '',
      name: '',
      domain: '',
      contactEmail: '',
      status: 'ACTIVE',
    });
    setActionError(null);
    setIsCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      code: company.code,
      name: company.name,
      domain: company.domain || '',
      contactEmail: company.contactEmail || '',
      status: company.status,
    });
    setActionError(null);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.code || !companyForm.name) {
      setActionError('Company code and name are required.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingCompany) {
        await editCompany(editingCompany.id, companyForm);
        displayMessage(`Company "${companyForm.name}" updated successfully.`);
      } else {
        await addCompany(companyForm);
        displayMessage(`Company "${companyForm.name}" created successfully.`);
      }
      setIsCompanyModalOpen(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveCompany = async (company: Company) => {
    const usage = company.usageCount || { tickets: 0, assets: 0, users: 0 };
    const confirmMsg =
      `Archive company "${company.name}" (${company.code})?\n\n` +
      `Historical integrity is guaranteed: ${usage.tickets} tickets, ${usage.assets} assets, and ${usage.users} users will retain their original company reference.\n\n` +
      `This company will be disabled for new ticket and asset creation, but remains available to Super Admin.`;

    if (!confirm(confirmMsg)) return;

    try {
      await archiveCompany(company.id, company.code);
      displayMessage(`Company "${company.name}" archived successfully. Historical references preserved.`);
    } catch (err: unknown) {
      displayMessage(err instanceof Error ? err.message : String(err), true);
    }
  };

  const handleRestoreCompany = async (company: Company) => {
    if (!confirm(`Restore company "${company.name}" (${company.code}) to ACTIVE status?`)) return;

    try {
      await restoreCompany(company.id);
      displayMessage(`Company "${company.name}" restored to ACTIVE status.`);
    } catch (err: unknown) {
      displayMessage(err instanceof Error ? err.message : String(err), true);
    }
  };

  // ---------------------------------------------
  // Location Handlers (Independent from Company)
  // ---------------------------------------------
  const handleOpenCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      code: '',
      name: '',
      address: '',
      city: '',
      country: '',
      timezone: 'UTC',
      status: 'ACTIVE',
    });
    setActionError(null);
    setIsLocationModalOpen(true);
  };

  const handleOpenEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationForm({
      code: location.code,
      name: location.name,
      address: location.address || '',
      city: location.city,
      country: location.country,
      timezone: location.timezone || 'UTC',
      status: location.status,
    });
    setActionError(null);
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationForm.code || !locationForm.name || !locationForm.city || !locationForm.country) {
      setActionError('Location code, name, city, and country are required.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingLocation) {
        await editLocation(editingLocation.id, locationForm);
        displayMessage(`Location "${locationForm.name}" updated successfully.`);
      } else {
        await addLocation(locationForm);
        displayMessage(`Location "${locationForm.name}" created successfully.`);
      }
      setIsLocationModalOpen(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveLocation = async (location: Location) => {
    const usage = location.usageCount || { tickets: 0, assets: 0, users: 0 };
    const confirmMsg =
      `Archive location "${location.name}" (${location.code})?\n\n` +
      `Historical integrity is guaranteed: ${usage.tickets} tickets, ${usage.assets} assets, and ${usage.users} users will retain their original location reference.\n\n` +
      `This location will be disabled for new selections, but remains available to Super Admin.`;

    if (!confirm(confirmMsg)) return;

    try {
      await archiveLocation(location.id, location.code);
      displayMessage(`Location "${location.name}" archived successfully. Historical references preserved.`);
    } catch (err: unknown) {
      displayMessage(err instanceof Error ? err.message : String(err), true);
    }
  };

  const handleRestoreLocation = async (location: Location) => {
    if (!confirm(`Restore location "${location.name}" (${location.code}) to ACTIVE status?`)) return;

    try {
      await restoreLocation(location.id);
      displayMessage(`Location "${location.name}" restored to ACTIVE status.`);
    } catch (err: unknown) {
      displayMessage(err instanceof Error ? err.message : String(err), true);
    }
  };

  // ---------------------------------------------
  // Department Handlers (Super Admin Alone)
  // ---------------------------------------------
  const handleOpenCreateDepartment = () => {
    setEditingDepartment(null);
    setDepartmentForm({
      code: '',
      name: '',
      description: '',
      status: 'ACTIVE',
    });
    setActionError(null);
    setIsDepartmentModalOpen(true);
  };

  const handleOpenEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setDepartmentForm({
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
      status: dept.status,
    });
    setActionError(null);
    setIsDepartmentModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentForm.code || !departmentForm.name) {
      setActionError('Department code and name are required.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingDepartment) {
        await editDepartment(editingDepartment.id, departmentForm);
        displayMessage(`Department "${departmentForm.name}" updated successfully.`);
      } else {
        await addDepartment(departmentForm);
        displayMessage(`Department "${departmentForm.name}" created successfully.`);
      }
      setIsDepartmentModalOpen(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveDepartment = async (dept: Department) => {
    const usage = dept.usageCount || { tickets: 0, assets: 0, users: 0 };
    const confirmMsg =
      `Archive department "${dept.name}" (${dept.code})?\n\n` +
      `Historical integrity is guaranteed: ${usage.tickets} tickets, ${usage.assets} assets, and ${usage.users} users will retain their original department reference.\n\n` +
      `This department will be disabled from employee dropdowns for new tickets, but remains available to Super Admin.`;

    if (!confirm(confirmMsg)) return;

    try {
      await archiveDepartment(dept.id, dept.code);
      displayMessage(`Department "${dept.name}" archived successfully. Historical references preserved.`);
    } catch (err: unknown) {
      displayMessage(err instanceof Error ? err.message : String(err), true);
    }
  };

  const handleRestoreDepartment = async (dept: Department) => {
    if (!confirm(`Restore department "${dept.name}" (${dept.code}) to ACTIVE status?`)) return;

    try {
      await restoreDepartment(dept.id);
      displayMessage(`Department "${dept.name}" restored to ACTIVE status.`);
    } catch (err: unknown) {
      displayMessage(err instanceof Error ? err.message : String(err), true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Organization Master-Data Management
            </h2>
            <Badge variant="purple">Database Driven</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Manage decoupled Companies, independent Locations, and predefined Departments.
            Super Admin alone manages departments and master data lifecycle with soft-delete historical preservation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Show / Hide Archived Toggle */}
          {isSuperAdmin && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                showArchived
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700'
              }`}
              title="Toggle display of archived master records"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showArchived ? 'Archived Visible' : 'Archived Hidden'}</span>
            </button>
          )}

          {isSuperAdmin && (
            activeTab === 'companies' ? (
              <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreateCompany}>
                Add Company
              </Button>
            ) : activeTab === 'locations' ? (
              <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreateLocation}>
                Add Location
              </Button>
            ) : (
              <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreateDepartment}>
                Add Department
              </Button>
            )
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Architectural Independence & Historical Integrity Notice */}
      <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-start gap-3 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
          <p className="font-bold">
            Independent Data Architecture &amp; Historical Preservation Rule
          </p>
          <p className="text-indigo-800 dark:text-indigo-300/90 font-medium">
            • <strong>Independent Master Data:</strong> Company and Location are independent entities with no mandatory hierarchy.
            <br />
            • <strong>Department Governance:</strong> Predefined dropdown selections; Super Admin alone adds, edits, or archives departments.
            <br />
            • <strong>Historical Integrity:</strong> Archived records are never physically removed; existing tickets, assets, and users preserve original historical references.
          </p>
        </div>
      </div>

      {/* Bento Segmented Tabs */}
      <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
        <button
          onClick={() => setActiveTab('companies')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'companies'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Companies ({companies.length})</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800">
            {companies.filter((c) => !c.isArchived).length} Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'locations'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Locations ({locations.length})</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/60 dark:border-blue-800">
            {locations.filter((l) => !l.isArchived).length} Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'departments'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Departments ({departments.length})</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800">
            {departments.filter((d) => !d.isArchived).length} Active
          </span>
        </button>
      </div>

      {/* Tab 1: Companies Grid */}
      {activeTab === 'companies' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => {
            const usage = company.usageCount || { tickets: 0, assets: 0, users: 0 };
            return (
              <Card
                key={company.id}
                title={company.name}
                subtitle={`Code: ${company.code}`}
                action={
                  <div className="flex items-center gap-1.5">
                    {company.isArchived ? (
                      <Badge variant="default" size="sm">ARCHIVED</Badge>
                    ) : (
                      <Badge
                        variant={company.status === 'ACTIVE' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {company.status}
                      </Badge>
                    )}
                  </div>
                }
                footer={
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {company.id}
                    </span>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenEditCompany(company)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                          title="Edit Company"
                        >
                          <span className="sr-only">Edit</span>
                        </Button>

                        {company.isArchived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={RotateCcw}
                            onClick={() => handleRestoreCompany(company)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Restore Company to Active Status"
                          >
                            <span className="sr-only">Restore</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Archive}
                            onClick={() => handleArchiveCompany(company)}
                            className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Archive Company (Preserves Historical Integrity)"
                          >
                            <span className="sr-only">Archive</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                }
              >
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="font-mono text-[11px] truncate">{company.domain || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{company.contactEmail || 'N/A'}</span>
                  </div>

                  {/* Historical Usage Indicators */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Ticket className="w-3 h-3 text-indigo-500" />
                        {usage.tickets} tickets
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Laptop className="w-3 h-3 text-blue-500" />
                        {usage.assets} assets
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Users className="w-3 h-3 text-emerald-500" />
                        {usage.users} users
                      </span>
                    </div>
                  </div>

                  {company.isArchived && company.archivedAt && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <History className="w-3 h-3 shrink-0" />
                      <span>Archived on {new Date(company.archivedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab 2: Locations Grid */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => {
            const usage = location.usageCount || { tickets: 0, assets: 0, users: 0 };
            return (
              <Card
                key={location.id}
                title={location.name}
                subtitle={`Code: ${location.code}`}
                action={
                  <div className="flex items-center gap-1.5">
                    {location.isArchived ? (
                      <Badge variant="default" size="sm">ARCHIVED</Badge>
                    ) : (
                      <Badge
                        variant={location.status === 'ACTIVE' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {location.status}
                      </Badge>
                    )}
                  </div>
                }
                footer={
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {location.id}
                    </span>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenEditLocation(location)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                          title="Edit Location"
                        >
                          <span className="sr-only">Edit</span>
                        </Button>

                        {location.isArchived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={RotateCcw}
                            onClick={() => handleRestoreLocation(location)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Restore Location to Active Status"
                          >
                            <span className="sr-only">Restore</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Archive}
                            onClick={() => handleArchiveLocation(location)}
                            className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Archive Location (Preserves Historical Integrity)"
                          >
                            <span className="sr-only">Archive</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                }
              >
                <div className="space-y-2 text-xs">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {location.address || 'Address on file'}
                  </p>
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <span>{location.city}</span>
                    <span>, {location.country}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>Timezone: {location.timezone || 'UTC'}</span>
                  </div>

                  {/* Historical Usage Indicators */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Ticket className="w-3 h-3 text-indigo-500" />
                        {usage.tickets} tickets
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Laptop className="w-3 h-3 text-blue-500" />
                        {usage.assets} assets
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Users className="w-3 h-3 text-emerald-500" />
                        {usage.users} users
                      </span>
                    </div>
                  </div>

                  {location.isArchived && location.archivedAt && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <History className="w-3 h-3 shrink-0" />
                      <span>Archived on {new Date(location.archivedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab 3: Departments Grid (Super Admin Alone) */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => {
            const usage = dept.usageCount || { tickets: 0, assets: 0, users: 0 };
            return (
              <Card
                key={dept.id}
                title={dept.name}
                subtitle={`Code: ${dept.code}`}
                action={
                  <div className="flex items-center gap-1.5">
                    {dept.isArchived ? (
                      <Badge variant="default" size="sm">ARCHIVED</Badge>
                    ) : (
                      <Badge
                        variant={dept.status === 'ACTIVE' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {dept.status}
                      </Badge>
                    )}
                  </div>
                }
                footer={
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {dept.id}
                    </span>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenEditDepartment(dept)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                          title="Edit Department"
                        >
                          <span className="sr-only">Edit</span>
                        </Button>

                        {dept.isArchived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={RotateCcw}
                            onClick={() => handleRestoreDepartment(dept)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Restore Department to Active Status"
                          >
                            <span className="sr-only">Restore</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Archive}
                            onClick={() => handleArchiveDepartment(dept)}
                            className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Archive Department (Preserves Historical Integrity)"
                          >
                            <span className="sr-only">Archive</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                }
              >
                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                    {dept.description || 'Predefined organization department.'}
                  </p>

                  {/* Historical Usage Indicators */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Ticket className="w-3 h-3 text-indigo-500" />
                        {usage.tickets} tickets
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Laptop className="w-3 h-3 text-blue-500" />
                        {usage.assets} assets
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <Users className="w-3 h-3 text-emerald-500" />
                        {usage.users} users
                      </span>
                    </div>
                  </div>

                  {dept.isArchived && dept.archivedAt && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <History className="w-3 h-3 shrink-0" />
                      <span>Archived on {new Date(dept.archivedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Company Modal */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={editingCompany ? 'Edit Company Master Record' : 'Create Independent Company'}
        subtitle="Saved to backend database and logged to security audit trail"
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Code"
              placeholder="e.g. APEX"
              value={companyForm.code}
              onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value.toUpperCase() })}
              required
              disabled={!!editingCompany}
              helperText="Unique identifier code"
            />
            <Select
              label="Status"
              value={companyForm.status}
              onChange={(e) => setCompanyForm({ ...companyForm, status: e.target.value as Company['status'] })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'ARCHIVED', label: 'ARCHIVED' },
              ]}
            />
          </div>

          <Input
            label="Company Name"
            placeholder="e.g. Apex Global Technologies"
            value={companyForm.name}
            onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
            required
          />

          <Input
            label="Domain"
            placeholder="e.g. apexglobal.io"
            value={companyForm.domain}
            onChange={(e) => setCompanyForm({ ...companyForm, domain: e.target.value })}
          />

          <Input
            label="Contact Email"
            type="email"
            placeholder="e.g. it-admin@apexglobal.io"
            value={companyForm.contactEmail}
            onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
          />

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCompanyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              {editingCompany ? 'Save Changes' : 'Create Company'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Location Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title={editingLocation ? 'Edit Location Master Record' : 'Create Independent Location'}
        subtitle="Independent facility master data stored in backend database"
      >
        <form onSubmit={handleSaveLocation} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Location Code"
              placeholder="e.g. NYC-HQ"
              value={locationForm.code}
              onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value.toUpperCase() })}
              required
              disabled={!!editingLocation}
            />
            <Select
              label="Status"
              value={locationForm.status}
              onChange={(e) => setLocationForm({ ...locationForm, status: e.target.value as Location['status'] })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'ARCHIVED', label: 'ARCHIVED' },
              ]}
            />
          </div>

          <Input
            label="Facility / Campus Name"
            placeholder="e.g. Global Headquarters - New York"
            value={locationForm.name}
            onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
            required
          />

          <Input
            label="Street Address"
            placeholder="e.g. 350 5th Avenue, Fl 42"
            value={locationForm.address}
            onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="e.g. New York"
              value={locationForm.city}
              onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
              required
            />
            <Input
              label="Country"
              placeholder="e.g. United States"
              value={locationForm.country}
              onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })}
              required
            />
          </div>

          <Input
            label="Timezone (IANA)"
            placeholder="e.g. America/New_York or UTC"
            value={locationForm.timezone}
            onChange={(e) => setLocationForm({ ...locationForm, timezone: e.target.value })}
          />

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLocationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              {editingLocation ? 'Save Changes' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Department Modal (Super Admin Alone) */}
      <Modal
        isOpen={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        title={editingDepartment ? 'Edit Department Master Record' : 'Create Organization Department'}
        subtitle="Super Admin governance: Predefined list used in employee selection dropdowns"
      >
        <form onSubmit={handleSaveDepartment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department Code"
              placeholder="e.g. ENG"
              value={departmentForm.code}
              onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value.toUpperCase() })}
              required
              disabled={!!editingDepartment}
              helperText="Unique department code"
            />
            <Select
              label="Status"
              value={departmentForm.status}
              onChange={(e) => setDepartmentForm({ ...departmentForm, status: e.target.value as Department['status'] })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'ARCHIVED', label: 'ARCHIVED' },
              ]}
            />
          </div>

          <Input
            label="Department Name"
            placeholder="e.g. Engineering & Technology"
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
            required
          />

          <Input
            label="Description / Responsibilities"
            placeholder="e.g. Software development, technical infrastructure, QA"
            value={departmentForm.description}
            onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
          />

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDepartmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              {editingDepartment ? 'Save Changes' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
