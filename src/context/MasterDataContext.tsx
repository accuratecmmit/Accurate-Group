import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Company, Location, Department } from '../types';
import {
  subscribeToCompanies,
  subscribeToLocations,
  subscribeToDepartments,
  createCompany as serviceCreateCompany,
  updateCompany as serviceUpdateCompany,
  deleteCompany as serviceDeleteCompany,
  createLocation as serviceCreateLocation,
  updateLocation as serviceUpdateLocation,
  deleteLocation as serviceDeleteLocation,
  initializeMasterDataIfEmpty,
} from '../services/masterDataService';
import {
  INITIAL_COMPANIES,
  INITIAL_LOCATIONS,
  INITIAL_DEPARTMENTS,
} from '../services/seedData';
import { useAuth } from './AuthContext';
import { logger } from '../lib/logger';

interface MasterDataContextType {
  companies: Company[];
  locations: Location[];
  departments: Department[];
  selectedCompanyId: string;
  selectedLocationId: string;
  setSelectedCompanyId: (id: string) => void;
  setSelectedLocationId: (id: string) => void;
  activeCompany: Company | null;
  activeLocation: Location | null;
  isLoading: boolean;
  isSeeding: boolean;
  seedInitialData: () => Promise<void>;
  addCompany: (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Company>;
  editCompany: (id: string, updates: Partial<Omit<Company, 'id' | 'createdAt'>>) => Promise<void>;
  removeCompany: (id: string, code: string) => Promise<void>;
  addLocation: (data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Location>;
  editLocation: (id: string, updates: Partial<Omit<Location, 'id' | 'createdAt'>>) => Promise<void>;
  removeLocation: (id: string, code: string) => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const MasterDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { effectiveRole } = useAuth();
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  useEffect(() => {
    let unsubCompanies: (() => void) | null = null;
    let unsubLocations: (() => void) | null = null;
    let unsubDepartments: (() => void) | null = null;

    try {
      unsubCompanies = subscribeToCompanies(
        (data) => {
          if (data && data.length > 0) {
            setCompanies(data);
          }
        },
        (err) => logger.warn('Companies subscription fallback to seed', { error: String(err) })
      );

      unsubLocations = subscribeToLocations(
        (data) => {
          if (data && data.length > 0) {
            setLocations(data);
          }
        },
        (err) => logger.warn('Locations subscription fallback to seed', { error: String(err) })
      );

      unsubDepartments = subscribeToDepartments(
        (data) => {
          if (data && data.length > 0) {
            setDepartments(data);
          }
        },
        (err) => logger.warn('Departments subscription fallback to seed', { error: String(err) })
      );
    } catch (e) {
      logger.warn('Non-blocking master data subscription notice:', e);
    }

    return () => {
      if (unsubCompanies) unsubCompanies();
      if (unsubLocations) unsubLocations();
      if (unsubDepartments) unsubDepartments();
    };
  }, []);

  const activeCompany = useMemo(() => {
    if (selectedCompanyId === 'ALL') return null;
    return companies.find((c) => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  const activeLocation = useMemo(() => {
    if (selectedLocationId === 'ALL') return null;
    return locations.find((l) => l.id === selectedLocationId) || null;
  }, [locations, selectedLocationId]);

  const seedInitialData = async () => {
    setIsSeeding(true);
    try {
      await initializeMasterDataIfEmpty();
    } finally {
      setIsSeeding(false);
    }
  };

  const addCompany = async (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await serviceCreateCompany(data, effectiveRole);
  };

  const editCompany = async (id: string, updates: Partial<Omit<Company, 'id' | 'createdAt'>>) => {
    await serviceUpdateCompany(id, updates, effectiveRole);
  };

  const removeCompany = async (id: string, code: string) => {
    await serviceDeleteCompany(id, code, effectiveRole);
  };

  const addLocation = async (data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await serviceCreateLocation(data, effectiveRole);
  };

  const editLocation = async (id: string, updates: Partial<Omit<Location, 'id' | 'createdAt'>>) => {
    await serviceUpdateLocation(id, updates, effectiveRole);
  };

  const removeLocation = async (id: string, code: string) => {
    await serviceDeleteLocation(id, code, effectiveRole);
  };

  return (
    <MasterDataContext.Provider
      value={{
        companies,
        locations,
        departments,
        selectedCompanyId,
        selectedLocationId,
        setSelectedCompanyId,
        setSelectedLocationId,
        activeCompany,
        activeLocation,
        isLoading,
        isSeeding,
        seedInitialData,
        addCompany,
        editCompany,
        removeCompany,
        addLocation,
        editLocation,
        removeLocation,
      }}
    >
      {children}
    </MasterDataContext.Provider>
  );
};

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}
