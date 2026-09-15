import React, { useState, useEffect } from 'react';
import { Asset, AssetCustomField } from '../../types';
import { createAsset, updateAsset } from '../../services/assetService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Laptop, Cpu, User, MapPin, Building, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  assetToEdit?: Asset | null;
  companies: any[];
  locations: any[];
  departments: any[];
  itTeams: any[];
  employees: any[];
  customFields: AssetCustomField[];
  isSuperAdmin: boolean;
  currentUserTeamId?: string;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  assetToEdit,
  companies,
  locations,
  departments,
  itTeams,
  employees,
  customFields,
  isSuperAdmin,
  currentUserTeamId,
}) => {
  const isEditing = Boolean(assetToEdit);

  // Form State
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<Asset['assetType']>('LAPTOP');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<Asset['status']>('Inactive');

  // Master Data links
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');

  // Specifications
  const [cpu, setCpu] = useState('');
  const [ramGb, setRamGb] = useState<number>(16);
  const [storageGb, setStorageGb] = useState<number>(512);
  const [storageType, setStorageType] = useState('NVMe SSD');
  const [os, setOs] = useState('Windows 11 Pro');
  const [macAddress, setMacAddress] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState<string>('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamic Custom Fields State
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (assetToEdit) {
      setAssetTag(assetToEdit.assetTag || '');
      setSerialNumber(assetToEdit.serialNumber || '');
      setName(assetToEdit.name || '');
      setAssetType(assetToEdit.assetType || 'LAPTOP');
      setManufacturer(assetToEdit.manufacturer || '');
      setModel(assetToEdit.model || '');
      setStatus(assetToEdit.status || 'Active');
      setCompanyId(assetToEdit.companyId || (companies[0]?.id || ''));
      setLocationId(assetToEdit.locationId || (locations[0]?.id || ''));
      setDepartmentId(assetToEdit.departmentId || '');
      setAssignedTeamId(assetToEdit.assignedTeamId || '');
      setAssignedUserId(assetToEdit.assignedUserId || '');
      setCpu(assetToEdit.specifications?.cpu || assetToEdit.specifications?.processor || '');
      setRamGb(assetToEdit.specifications?.ramGb || 16);
      setStorageGb(assetToEdit.specifications?.storageGb || 512);
      setStorageType(assetToEdit.specifications?.storageType || 'NVMe SSD');
      setOs(assetToEdit.specifications?.os || assetToEdit.specifications?.operatingSystem || 'Windows 11 Pro');
      setMacAddress(assetToEdit.specifications?.macAddress || '');
      setIpAddress(assetToEdit.specifications?.ipAddress || '');
      setPurchaseDate(assetToEdit.purchaseDate || assetToEdit.specifications?.purchaseDate || '');
      setPurchaseCost(assetToEdit.purchaseCost ? String(assetToEdit.purchaseCost) : '');
      setWarrantyExpiryDate(assetToEdit.warrantyExpiryDate || assetToEdit.specifications?.warrantyExpiryDate || '');
      setNotes(assetToEdit.notes || '');
      setCustomFieldValues(assetToEdit.customFields || {});
    } else {
      // Reset defaults
      setAssetTag('');
      setSerialNumber('');
      setName('');
      setAssetType('LAPTOP');
      setManufacturer('');
      setModel('');
      setStatus('Inactive');
      setCompanyId(companies[0]?.id || '');
      setLocationId(locations[0]?.id || '');
      setDepartmentId('');
      setAssignedTeamId(isSuperAdmin ? (itTeams[0]?.id || '') : (currentUserTeamId || ''));
      setAssignedUserId('');
      setCpu('');
      setRamGb(16);
      setStorageGb(512);
      setStorageType('NVMe SSD');
      setOs('Windows 11 Pro');
      setMacAddress('');
      setIpAddress('');
      setPurchaseDate('');
      setPurchaseCost('');
      setWarrantyExpiryDate('');
      setNotes('');
      setCustomFieldValues({});
    }
    setErrorMsg(null);
  }, [assetToEdit, isOpen]);

  if (!isOpen) return null;

  const handleCustomFieldChange = (key: string, val: any) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetTag.trim() || !serialNumber.trim() || !name.trim()) {
      setErrorMsg('Asset Tag, Serial Number, and Name are strictly required.');
      return;
    }
    if (!locationId) {
      setErrorMsg('Location must be selected from managed Location master data.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: Partial<Asset> = {
      assetTag: assetTag.trim().toUpperCase(),
      serialNumber: serialNumber.trim().toUpperCase(),
      name: name.trim(),
      assetType,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      status: assignedUserId && status === 'Inactive' ? 'Active' : status,
      companyId: companyId || (companies[0]?.id || ''),
      locationId,
      departmentId: departmentId || null,
      assignedTeamId: isSuperAdmin ? assignedTeamId || null : currentUserTeamId || null,
      assignedUserId: assignedUserId || null,
      purchaseDate: purchaseDate || null,
      purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null,
      warrantyExpiryDate: warrantyExpiryDate || null,
      notes: notes.trim() || null,
      customFields: customFieldValues,
      specifications: {
        cpu: cpu.trim() || undefined,
        processor: cpu.trim() || undefined,
        ramGb: Number(ramGb) || 16,
        storageGb: Number(storageGb) || 512,
        storageType,
        os: os.trim() || undefined,
        operatingSystem: os.trim() || undefined,
        macAddress: macAddress.trim() || undefined,
        ipAddress: ipAddress.trim() || undefined,
      },
    };

    try {
      if (isEditing && assetToEdit) {
        const res = await updateAsset(assetToEdit.id, payload);
        if (res.success) {
          onSaved();
          onClose();
        } else {
          setErrorMsg(res.error || 'Failed to update asset');
        }
      } else {
        const res = await createAsset(payload);
        if (res.success) {
          onSaved();
          onClose();
        } else {
          setErrorMsg(res.error || 'Failed to register asset');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 space-y-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                {isEditing ? `Edit Asset ${assetToEdit?.assetTag}` : 'Register New Computer Asset'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure unique identifiers, hardware specifications, and single-employee assignment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form id="asset-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* Section 1: Unique Identification */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              1. Unique Identification & Hardware Profile
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Asset / Inventory Tag *
                </label>
                <input
                  type="text"
                  required
                  placeholder="AST-00101"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Serial Number (Unique) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="5CD9281ABC"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Name / Model Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Lenovo ThinkPad T14s"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hardware Type
                </label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  <option value="LAPTOP">Laptop</option>
                  <option value="DESKTOP">Desktop</option>
                  <option value="WORKSTATION">Workstation</option>
                  <option value="SERVER">Server</option>
                  <option value="MONITOR">Monitor</option>
                  <option value="NETWORK_DEVICE">Network Device</option>
                  <option value="OTHER">Other Peripheral</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  placeholder="Lenovo, Dell, HP, Apple"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Model Identifier
                </label>
                <input
                  type="text"
                  placeholder="ThinkPad T14s Gen 3"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="Active">Active (In Service)</option>
                  <option value="Inactive">Inactive (In Stock Pool)</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Retired">Retired (Preserved)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Location & Assignment (Strict 1 Employee) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              2. Managed Location & Employee Assignment (1-to-1 Rule)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Location (Managed Master Data) *
                </label>
                <select
                  value={locationId}
                  required
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  <option value="">-- Select Location --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company (Master Data)
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Employee (Single Employee)
                </label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  <option value="">-- Unassigned (In Stock) --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.displayName} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Detailed Specifications */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              3. Hardware Specifications & Networking
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Processor / CPU
                </label>
                <input
                  type="text"
                  placeholder="Intel Core i7-1270P"
                  value={cpu}
                  onChange={(e) => setCpu(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  RAM (GB)
                </label>
                <input
                  type="number"
                  value={ramGb}
                  onChange={(e) => setRamGb(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Storage (GB)
                </label>
                <input
                  type="number"
                  value={storageGb}
                  onChange={(e) => setStorageGb(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Operating System
                </label>
                <input
                  type="text"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  MAC Address
                </label>
                <input
                  type="text"
                  placeholder="00:1A:2B:3C:4D:5E"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  placeholder="10.20.4.15"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Purchase Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1299.00"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Warranty Expiry
                </label>
                <input
                  type="date"
                  value={warrantyExpiryDate}
                  onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Super Admin Custom Fields (If Any) */}
          {customFields.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                4. Organization Custom Fields
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customFields.map((cf) => {
                  const currVal = customFieldValues[cf.fieldKey] ?? '';

                  return (
                    <div key={cf.id}>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {cf.label} {cf.isRequired && '*'}
                      </label>
                      {cf.fieldType === 'SELECT' ? (
                        <select
                          value={currVal}
                          onChange={(e) => handleCustomFieldChange(cf.fieldKey, e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        >
                          <option value="">-- Select {cf.label} --</option>
                          {(cf.options || []).map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : cf.fieldType === 'BOOLEAN' ? (
                        <select
                          value={currVal === true ? 'true' : currVal === false ? 'false' : ''}
                          onChange={(e) =>
                            handleCustomFieldChange(
                              cf.fieldKey,
                              e.target.value === 'true' ? true : e.target.value === 'false' ? false : ''
                            )
                          }
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                        >
                          <option value="">-- Select --</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : cf.fieldType === 'NUMBER' ? (
                        <input
                          type="number"
                          value={currVal}
                          onChange={(e) => handleCustomFieldChange(cf.fieldKey, Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : cf.fieldType === 'DATE' ? (
                        <input
                          type="date"
                          value={currVal}
                          onChange={(e) => handleCustomFieldChange(cf.fieldKey, e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={currVal}
                          placeholder={cf.description || ''}
                          onChange={(e) => handleCustomFieldChange(cf.fieldKey, e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 5: Notes */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Administrative Notes & History Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Assigned with docking station, standard developer image installed."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="asset-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-xs"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Asset' : 'Register Computer Asset'}
          </Button>
        </div>
      </div>
    </div>
  );
};
