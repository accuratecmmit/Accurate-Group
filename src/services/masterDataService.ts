import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  Company,
  Location,
  Department,
  ITTeam,
  SLAConfig,
  SequenceCounter,
  SystemConfig,
  OperationType,
} from '../types';
import {
  INITIAL_COMPANIES,
  INITIAL_LOCATIONS,
  INITIAL_DEPARTMENTS,
  INITIAL_IT_TEAMS,
  INITIAL_SLA_CONFIGS,
  INITIAL_SEQUENCES,
  INITIAL_ROLES,
} from './seedData';
import { handleFirestoreError } from '../lib/errors';
import { logAuditEvent } from './auditService';
import { logger } from '../lib/logger';

/**
 * Initializes the database configuration if not yet initialized.
 * Seeds initial 3 companies, 6 locations, departments, IT teams, SLAs, roles,
 * and sequence counters into Firestore.
 */
export async function initializeMasterDataIfEmpty(): Promise<{
  seeded: boolean;
  companiesCount: number;
  locationsCount: number;
  departmentsCount: number;
  itTeamsCount: number;
}> {
  const configPath = 'system_config';
  const configDocRef = doc(db, configPath, 'init');

  try {
    const configSnap = await getDoc(configDocRef);
    if (configSnap.exists() && configSnap.data().initialSeedCompleted) {
      return {
        seeded: false,
        companiesCount: INITIAL_COMPANIES.length,
        locationsCount: INITIAL_LOCATIONS.length,
        departmentsCount: INITIAL_DEPARTMENTS.length,
        itTeamsCount: INITIAL_IT_TEAMS.length,
      };
    }

    // Verify if current session has Firebase Super Admin authorization before executing write operations
    const currentUser = auth.currentUser;
    const isAuthorizedAdmin = Boolean(
      currentUser &&
      currentUser.email &&
      (currentUser.email.toLowerCase() === 'accuratecmmit@gmail.com')
    );

    if (!isAuthorizedAdmin) {
      // Unauthenticated or non-admin sessions utilize authoritative local seeds; cloud seeding requires Super Admin
      return {
        seeded: false,
        companiesCount: INITIAL_COMPANIES.length,
        locationsCount: INITIAL_LOCATIONS.length,
        departmentsCount: INITIAL_DEPARTMENTS.length,
        itTeamsCount: INITIAL_IT_TEAMS.length,
      };
    }

    logger.info('Initializing full database-driven master data in Firestore as authorized Super Admin...');
    const now = new Date().toISOString();

    // 1. Seed Roles
    for (const role of INITIAL_ROLES) {
      const roleRef = doc(db, 'roles', role.id);
      const snap = await getDoc(roleRef);
      if (!snap.exists()) {
        await setDoc(roleRef, role);
      }
    }

    // 2. Seed initial 3 companies
    for (const company of INITIAL_COMPANIES) {
      const compDocRef = doc(db, 'companies', company.id);
      const existingSnap = await getDoc(compDocRef);
      if (!existingSnap.exists()) {
        await setDoc(compDocRef, {
          ...company,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 3. Seed initial 6 locations
    for (const location of INITIAL_LOCATIONS) {
      const locDocRef = doc(db, 'locations', location.id);
      const existingSnap = await getDoc(locDocRef);
      if (!existingSnap.exists()) {
        await setDoc(locDocRef, {
          ...location,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 4. Seed Departments
    for (const dept of INITIAL_DEPARTMENTS) {
      const deptRef = doc(db, 'departments', dept.id);
      const existingSnap = await getDoc(deptRef);
      if (!existingSnap.exists()) {
        await setDoc(deptRef, {
          ...dept,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 5. Seed IT Teams
    for (const team of INITIAL_IT_TEAMS) {
      const teamRef = doc(db, 'it_teams', team.id);
      const existingSnap = await getDoc(teamRef);
      if (!existingSnap.exists()) {
        await setDoc(teamRef, {
          ...team,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 6. Seed SLA Configs
    for (const sla of INITIAL_SLA_CONFIGS) {
      const slaRef = doc(db, 'sla_configs', sla.id);
      const existingSnap = await getDoc(slaRef);
      if (!existingSnap.exists()) {
        await setDoc(slaRef, {
          ...sla,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 7. Seed Atomic Sequence Counters (Non-reusable tickets & assets)
    for (const seq of INITIAL_SEQUENCES) {
      const seqRef = doc(db, 'sequences', seq.id);
      const existingSnap = await getDoc(seqRef);
      if (!existingSnap.exists()) {
        await setDoc(seqRef, {
          ...seq,
          updatedAt: now,
        });
      }
    }

    // 8. Mark config as completed
    const systemConfig: SystemConfig = {
      id: 'init',
      initialSeedCompleted: true,
      seededAt: now,
      systemVersion: '1.0.0',
      updatedAt: now,
    };
    await setDoc(configDocRef, systemConfig);

    logger.info('Database master data initialization completed successfully.');
    return {
      seeded: true,
      companiesCount: INITIAL_COMPANIES.length,
      locationsCount: INITIAL_LOCATIONS.length,
      departmentsCount: INITIAL_DEPARTMENTS.length,
      itTeamsCount: INITIAL_IT_TEAMS.length,
    };
  } catch (error) {
    logger.error('Master data database seed error', error);
    return {
      seeded: false,
      companiesCount: 0,
      locationsCount: 0,
      departmentsCount: 0,
      itTeamsCount: 0,
    };
  }
}

// ========================
// COMPANIES CRUD
// ========================

export function subscribeToCompanies(
  onUpdate: (companies: Company[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const path = 'companies';
  const q = query(collection(db, path), orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const companies: Company[] = snapshot.docs
        .map((d) => d.data() as Company)
        .filter((c) => !c.isDeleted);
      onUpdate(companies);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createCompany(
  companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
  actorRole: string
): Promise<Company> {
  const path = 'companies';
  const id = `comp_${companyData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const newCompany: Company = {
    ...companyData,
    id,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, path, id), newCompany);
    await logAuditEvent({
      action: 'COMPANY_CREATED',
      entityType: 'COMPANY',
      entityId: id,
      companyId: id,
      actorRole,
      details: { code: newCompany.code, name: newCompany.name },
    });
    return newCompany;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${path}/${id}`);
  }
}

export async function updateCompany(
  id: string,
  updates: Partial<Omit<Company, 'id' | 'createdAt'>>,
  actorRole: string
): Promise<void> {
  const path = 'companies';
  const now = new Date().toISOString();

  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'COMPANY_UPDATED',
      entityType: 'COMPANY',
      entityId: id,
      companyId: id,
      actorRole,
      details: updates,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
}

/**
 * Soft delete: preserve historical records. Never physically drops the row.
 */
export async function deleteCompany(id: string, code: string, actorRole: string): Promise<void> {
  const path = 'companies';
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, path, id), {
      isDeleted: true,
      status: 'INACTIVE',
      updatedAt: now,
    });
    await logAuditEvent({
      action: 'COMPANY_DELETED_SOFT',
      entityType: 'COMPANY',
      entityId: id,
      companyId: id,
      actorRole,
      details: { code, note: 'Soft-deleted to preserve ticket & asset historical audit trails' },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
}

// ========================
// LOCATIONS CRUD
// ========================

export function subscribeToLocations(
  onUpdate: (locations: Location[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const path = 'locations';
  const q = query(collection(db, path), orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const locations: Location[] = snapshot.docs
        .map((d) => d.data() as Location)
        .filter((l) => !l.isDeleted);
      onUpdate(locations);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createLocation(
  locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
  actorRole: string
): Promise<Location> {
  const path = 'locations';
  const id = `loc_${locationData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const newLocation: Location = {
    ...locationData,
    id,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, path, id), newLocation);
    await logAuditEvent({
      action: 'LOCATION_CREATED',
      entityType: 'LOCATION',
      entityId: id,
      locationId: id,
      actorRole,
      details: { code: newLocation.code, name: newLocation.name, city: newLocation.city },
    });
    return newLocation;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${path}/${id}`);
  }
}

export async function updateLocation(
  id: string,
  updates: Partial<Omit<Location, 'id' | 'createdAt'>>,
  actorRole: string
): Promise<void> {
  const path = 'locations';
  const now = new Date().toISOString();

  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'LOCATION_UPDATED',
      entityType: 'LOCATION',
      entityId: id,
      locationId: id,
      actorRole,
      details: updates,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
}

/**
 * Soft delete: preserve historical records.
 */
export async function deleteLocation(id: string, code: string, actorRole: string): Promise<void> {
  const path = 'locations';
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, path, id), {
      isDeleted: true,
      status: 'INACTIVE',
      updatedAt: now,
    });
    await logAuditEvent({
      action: 'LOCATION_DELETED_SOFT',
      entityType: 'LOCATION',
      entityId: id,
      locationId: id,
      actorRole,
      details: { code, note: 'Soft-deleted to preserve ticket & asset historical audit trails' },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
}

// ========================
// DEPARTMENTS CRUD
// ========================

export function subscribeToDepartments(
  onUpdate: (departments: Department[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const path = 'departments';
  const q = query(collection(db, path), orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const departments: Department[] = snapshot.docs
        .map((d) => d.data() as Department)
        .filter((dept) => !dept.isDeleted);
      onUpdate(departments);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ========================
// IT TEAMS CRUD
// ========================

export function subscribeToITTeams(
  onUpdate: (teams: ITTeam[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const path = 'it_teams';
  const q = query(collection(db, path), orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const teams: ITTeam[] = snapshot.docs
        .map((d) => d.data() as ITTeam)
        .filter((t) => !t.isDeleted);
      onUpdate(teams);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ========================
// SLA CONFIGS CRUD
// ========================

export function subscribeToSLAConfigs(
  onUpdate: (slas: SLAConfig[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const path = 'sla_configs';
  const q = query(collection(db, path), orderBy('responseTimeMinutes', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const slas: SLAConfig[] = snapshot.docs
        .map((d) => d.data() as SLAConfig)
        .filter((s) => !s.isDeleted);
      onUpdate(slas);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
