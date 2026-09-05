import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Globe,
  Mail,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useMasterData } from '../../context/MasterDataContext';
import { useAuth } from '../../context/AuthContext';
import { Company, Location } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { RoleGate } from '../auth/RoleGate';

export const MasterDataManager: React.FC = () => {
  const {
    companies,
    locations,
    isLoading,
    isSeeding,
    seedInitialData,
    addCompany,
    editCompany,
    removeCompany,
    addLocation,
    editLocation,
    removeLocation,
  } = useMasterData();

  const { isSuperAdmin, effectiveRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'companies' | 'locations'>('companies');

  // Modal states
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    code: '',
    name: '',
    domain: '',
    contactEmail: '',
    status: 'ACTIVE' as Company['status'],
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    timezone: 'America/New_York',
    status: 'ACTIVE' as Location['status'],
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Company Handlers
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
      setActionError('Code and Name are required fields.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingCompany) {
        await editCompany(editingCompany.id, companyForm);
      } else {
        await addCompany(companyForm);
      }
      setIsCompanyModalOpen(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Are you sure you want to delete company "${company.name}" (${company.code})? This action will be audited.`)) {
      return;
    }
    try {
      await removeCompany(company.id, company.code);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Location Handlers
  const handleOpenCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      code: '',
      name: '',
      address: '',
      city: '',
      state: '',
      country: 'United States',
      timezone: 'America/New_York',
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
      state: location.state || '',
      country: location.country,
      timezone: location.timezone || 'America/New_York',
      status: location.status,
    });
    setActionError(null);
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationForm.code || !locationForm.name || !locationForm.city || !locationForm.country) {
      setActionError('Code, Name, City, and Country are required.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingLocation) {
        await editLocation(editingLocation.id, locationForm);
      } else {
        await addLocation(locationForm);
      }
      setIsLocationModalOpen(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocation = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete location "${location.name}" (${location.code})? This action will be audited.`)) {
      return;
    }
    try {
      await removeLocation(location.id, location.code);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Master Data Architecture Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Independent Master Data Governance
            </h2>
            <Badge variant="purple">Database Driven</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Companies and Locations exist as decoupled independent master data entities stored dynamically in Firestore.
            Super Admin has complete control to define, adjust, and audit multi-tenant structures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={isSeeding}
              onClick={() => seedInitialData()}
              title="Ensure initial 3 companies and 6 locations exist in Firestore"
            >
              Verify DB Seeds
            </Button>
          )}

          {isSuperAdmin && (
            activeTab === 'companies' ? (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={handleOpenCreateCompany}
              >
                Add Company
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={handleOpenCreateLocation}
              >
                Add Location
              </Button>
            )
          )}
        </div>
      </div>

      {/* Independent Master Data Architecture Callout */}
      <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start gap-3 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
          <p className="font-bold">
            Architectural Rule: Decoupled Independent Master Data
          </p>
          <p className="text-indigo-800 dark:text-indigo-300/90 font-medium">
            Unlike rigid single-tenant systems, company entities and location entities are strictly independent.
            This allows computers, users, or tickets from <strong>Company A</strong> to be serviced at <strong>Location B</strong>,
            or shared service centers to service multiple companies simultaneously.
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
            Initial 3
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
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
            Initial 6
          </span>
        </button>
      </div>

      {/* Tab 1: Companies Grid */}
      {activeTab === 'companies' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {companies.map((company) => (
            <Card
              key={company.id}
              title={company.name}
              subtitle={`Code: ${company.code}`}
              action={
                <Badge
                  variant={company.status === 'ACTIVE' ? 'success' : company.status === 'SUSPENDED' ? 'danger' : 'warning'}
                  size="sm"
                >
                  {company.status}
                </Badge>
              }
              footer={
                <div className="w-full flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDeleteCompany(company)}
                        className="p-1 text-rose-500 hover:text-rose-700"
                        title="Delete Company"
                      >
                        <span className="sr-only">Delete</span>
                      </Button>
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
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Created: {new Date(company.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Locations Grid */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <Card
              key={location.id}
              title={location.name}
              subtitle={`Code: ${location.code}`}
              action={
                <Badge
                  variant={location.status === 'ACTIVE' ? 'success' : location.status === 'MAINTENANCE' ? 'warning' : 'default'}
                  size="sm"
                >
                  {location.status}
                </Badge>
              }
              footer={
                <div className="w-full flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDeleteLocation(location)}
                        className="p-1 text-rose-500 hover:text-rose-700"
                        title="Delete Location"
                      >
                        <span className="sr-only">Delete</span>
                      </Button>
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
                  {location.state && <span>, {location.state}</span>}
                  <span>, {location.country}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Timezone: {location.timezone || 'UTC'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Company Create/Edit Modal */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={editingCompany ? 'Edit Company Master Record' : 'Create Independent Company'}
        subtitle="Saved to Firestore and logged to security audit trail"
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {actionError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Code"
              placeholder="e.g. APEX"
              value={companyForm.code}
              onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value.toUpperCase() })}
              required
              disabled={!!editingCompany}
              helperText="Unique uppercase identifier"
            />
            <Select
              label="Status"
              value={companyForm.status}
              onChange={(e) => setCompanyForm({ ...companyForm, status: e.target.value as Company['status'] })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'SUSPENDED', label: 'SUSPENDED' },
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

      {/* Location Create/Edit Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title={editingLocation ? 'Edit Location Master Record' : 'Create Independent Location'}
        subtitle="Independent facility master data stored in Firestore"
      >
        <form onSubmit={handleSaveLocation} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {actionError}
            </div>
          )}

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
                { value: 'MAINTENANCE', label: 'MAINTENANCE' },
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

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              placeholder="e.g. New York"
              value={locationForm.city}
              onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
              required
            />
            <Input
              label="State / Region"
              placeholder="e.g. NY"
              value={locationForm.state}
              onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
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
            placeholder="e.g. America/New_York"
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
    </div>
  );
};
