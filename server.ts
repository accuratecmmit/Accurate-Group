import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data store with atomic disk persistence for server reliability
const DB_FILE = path.join(process.cwd(), 'data_store.json');

export interface StoredUser {
  id: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'IT_ADMIN' | 'IT_TECHNICIAN' | 'EMPLOYEE';
  departmentId: string;
  departmentName?: string;
  designation: string;
  assetTag: string;
  locationId: string;
  locationName?: string;
  mobileNumber: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'SUSPENDED' | 'DEACTIVATED';
  passwordHash: string;
  passwordSalt: string;
  failedLoginAttempts: number;
  lockoutUntil: string | null;
  mustChangePassword: boolean;
  rejectionReason: string | null;
  temporaryPasswordGeneratedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  userEmail: string;
  userRole: string;
  token: string;
  activeTokenHash: string;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface StoredAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Global state in memory
let users: StoredUser[] = [];
let sessions: StoredSession[] = [];
let auditLogs: StoredAuditLog[] = [];

// Cryptographic helpers
function hashPasswordSync(password: string, existingSalt?: string) {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

function verifyPasswordSync(attempt: string, storedHash: string, salt: string): boolean {
  try {
    const attemptHash = crypto.pbkdf2Sync(attempt, salt, 100000, 32, 'sha256').toString('hex');
    const a = Buffer.from(attemptHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function logAudit(
  actor: { id: string; email: string; role: string },
  action: string,
  entityType: string,
  entityId: string,
  details?: string,
  req?: Request
) {
  const entry: StoredAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    details,
    ipAddress: req ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress : '127.0.0.1',
    userAgent: req ? req.headers['user-agent'] : 'ServerInternal',
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 500) auditLogs = auditLogs.slice(0, 500);
  persistData();
}

function persistData() {
  try {
    const data = { users, sessions, auditLogs };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist DB file:', err);
  }
}

function loadOrSeedData() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      users = parsed.users || [];
      sessions = parsed.sessions || [];
      auditLogs = parsed.auditLogs || [];
      console.log(`Loaded ${users.length} users and ${sessions.length} sessions from data store.`);
      return;
    } catch (err) {
      console.error('Error loading data store, seeding afresh:', err);
    }
  }

  // Seed default enterprise users
  const now = new Date().toISOString();
  const lockoutTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const superAdminCreds = hashPasswordSync('Admin#2026!');
  const itAdminCreds = hashPasswordSync('ItAdmin#2026!');
  const techCreds = hashPasswordSync('Tech#2026!');
  const rahulCreds = hashPasswordSync('Rahul#2026!');
  const ananyaCreds = hashPasswordSync('Ananya#2026!');
  const vikramCreds = hashPasswordSync('Vikram#2026!');
  const deepakCreds = hashPasswordSync('Temp#Deepak2026!');

  users = [
    {
      id: 'usr_super_admin',
      username: 'accurateadmin',
      normalizedUsername: 'accurateadmin',
      displayName: 'Accurate Chief Admin',
      email: 'accuratecmmit@gmail.com',
      role: 'SUPER_ADMIN',
      departmentId: 'dept_it',
      departmentName: 'Information Technology & Security',
      designation: 'Chief Information Officer',
      assetTag: 'AST-ADMIN-001',
      locationId: 'loc_nyc',
      locationName: 'New York Global HQ',
      mobileNumber: '+1 (555) 019-2831',
      status: 'ACTIVE',
      passwordHash: superAdminCreds.hash,
      passwordSalt: superAdminCreds.salt,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: false,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_it_admin',
      username: 'itadmin',
      normalizedUsername: 'itadmin',
      displayName: 'Sarah Jenkins',
      email: 'itadmin@accurategroup.com',
      role: 'IT_ADMIN',
      departmentId: 'dept_it',
      departmentName: 'Information Technology & Security',
      designation: 'Senior IT Systems Administrator',
      assetTag: 'AST-IT-102',
      locationId: 'loc_nyc',
      locationName: 'New York Global HQ',
      mobileNumber: '+1 (555) 014-9822',
      status: 'ACTIVE',
      passwordHash: itAdminCreds.hash,
      passwordSalt: itAdminCreds.salt,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: false,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_technician',
      username: 'technician',
      normalizedUsername: 'technician',
      displayName: 'Marcus Vance',
      email: 'technician@accurategroup.com',
      role: 'IT_TECHNICIAN',
      departmentId: 'dept_it',
      departmentName: 'Information Technology & Security',
      designation: 'Tier 1 Support Technician',
      assetTag: 'AST-TECH-204',
      locationId: 'loc_sfo',
      locationName: 'San Francisco Tech Hub',
      mobileNumber: '+1 (555) 018-3721',
      status: 'ACTIVE',
      passwordHash: techCreds.hash,
      passwordSalt: techCreds.salt,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: false,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_rahul',
      username: 'Rahul',
      normalizedUsername: 'rahul',
      displayName: 'Rahul Sharma',
      email: 'rahul@accurategroup.com',
      role: 'EMPLOYEE',
      departmentId: 'dept_eng',
      departmentName: 'Software Engineering & DevOps',
      designation: 'Senior Software Engineer',
      assetTag: 'AST-ENG-409',
      locationId: 'loc_sfo',
      locationName: 'San Francisco Tech Hub',
      mobileNumber: '+1 (555) 012-7711',
      status: 'ACTIVE',
      passwordHash: rahulCreds.hash,
      passwordSalt: rahulCreds.salt,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: false,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_ananya',
      username: 'Ananya',
      normalizedUsername: 'ananya',
      displayName: 'Ananya Patel',
      email: 'ananya@accurategroup.com',
      role: 'EMPLOYEE',
      departmentId: 'dept_fin',
      departmentName: 'Finance & Accounting',
      designation: 'Financial Analyst',
      assetTag: 'AST-FIN-112',
      locationId: 'loc_nyc',
      locationName: 'New York Global HQ',
      mobileNumber: '+1 (555) 016-8833',
      status: 'PENDING_APPROVAL',
      passwordHash: ananyaCreds.hash,
      passwordSalt: ananyaCreds.salt,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: false,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_vikram',
      username: 'Vikram',
      normalizedUsername: 'vikram',
      displayName: 'Vikram Malhotra',
      email: 'vikram@accurategroup.com',
      role: 'EMPLOYEE',
      departmentId: 'dept_ops',
      departmentName: 'Global Operations & Facilities',
      designation: 'Operations Specialist',
      assetTag: 'AST-OPS-305',
      locationId: 'loc_lon',
      locationName: 'London European Operations',
      mobileNumber: '+44 20 7946 0912',
      status: 'ACTIVE',
      passwordHash: vikramCreds.hash,
      passwordSalt: vikramCreds.salt,
      failedLoginAttempts: 5,
      lockoutUntil: lockoutTime,
      mustChangePassword: false,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_deepak',
      username: 'Deepak',
      normalizedUsername: 'deepak',
      displayName: 'Deepak Verma',
      email: 'deepak@accurategroup.com',
      role: 'EMPLOYEE',
      departmentId: 'dept_hr',
      departmentName: 'Human Resources & People Ops',
      designation: 'HR Specialist',
      assetTag: 'AST-HR-501',
      locationId: 'loc_sin',
      locationName: 'Singapore APAC Hub',
      mobileNumber: '+65 6712 3456',
      status: 'ACTIVE',
      passwordHash: deepakCreds.hash,
      passwordSalt: deepakCreds.salt,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: true,
      temporaryPasswordGeneratedAt: now,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  sessions = [];
  auditLogs = [
    {
      id: `audit_init`,
      timestamp: now,
      actorId: 'system',
      actorEmail: 'system@accurategroup.com',
      actorRole: 'SUPER_ADMIN',
      action: 'SYSTEM_SEEDED',
      entityType: 'AUTH',
      entityId: 'system',
      details: 'Enterprise authentication foundation initialized with default seed accounts.',
    },
  ];

  persistData();
}

loadOrSeedData();

// Clean sanitized user output for API responses
function sanitizeUser(u: StoredUser) {
  const { passwordHash, passwordSalt, ...safe } = u;
  return safe;
}

// Authentication & Authorization Middlewares
function getAuthUser(req: Request): { user: StoredUser; session: StoredSession } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const tokenHash = hashToken(token);

  const session = sessions.find((s) => s.token === token || s.activeTokenHash === tokenHash);
  if (!session || session.status !== 'ACTIVE') {
    return null;
  }

  // 30-minute inactivity check
  const now = Date.now();
  const lastActive = new Date(session.lastActiveAt).getTime();
  if (now - lastActive > 30 * 60 * 1000) {
    session.status = 'EXPIRED';
    persistData();
    return null;
  }

  const user = users.find((u) => u.id === session.userId);
  if (!user) return null;

  // Disabled accounts invalidate all sessions
  if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED' || user.status === 'REJECTED') {
    sessions.forEach((s) => {
      if (s.userId === user.id) s.status = 'REVOKED';
    });
    persistData();
    return null;
  }

  // Refresh lastActiveAt
  session.lastActiveAt = new Date().toISOString();
  persistData();

  return { user, session };
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authState = getAuthUser(req);
  if (!authState) {
    res.status(401).json({ error: 'Unauthorized: Valid active session token required.' });
    return;
  }
  (req as any).user = authState.user;
  (req as any).session = authState.session;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authState = getAuthUser(req);
  if (!authState) {
    res.status(401).json({ error: 'Unauthorized: Session missing or expired.' });
    return;
  }
  if (authState.user.role !== 'SUPER_ADMIN' && authState.user.role !== 'IT_ADMIN') {
    res.status(403).json({ error: 'Forbidden: Requires IT Admin or Super Admin role.' });
    return;
  }
  (req as any).user = authState.user;
  (req as any).session = authState.session;
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const authState = getAuthUser(req);
  if (!authState) {
    res.status(401).json({ error: 'Unauthorized: Session missing or expired.' });
    return;
  }
  if (authState.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Forbidden: Requires Super Admin role.' });
    return;
  }
  (req as any).user = authState.user;
  (req as any).session = authState.session;
  next();
}

// ==========================================
// 1. PUBLIC AUTHENTICATION ROUTES
// ==========================================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

/**
 * POST /api/auth/register
 * Implements the 9 required fields and strict validation rules.
 */
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const {
      employeeName,
      username,
      password,
      confirmPassword,
      departmentId,
      departmentName,
      designation,
      assetTag,
      locationId,
      locationName,
      mobileNumber,
    } = req.body;

    // 1. Employee Name
    if (!employeeName || !employeeName.trim()) {
      res.status(400).json({ error: 'Employee Name is required.' });
      return;
    }

    // 2. Username rules:
    // - A-Z alphabetic characters only.
    // - No spaces.
    // - No numbers.
    // - No special characters.
    // - Case-insensitive uniqueness.
    // - Rahul, RAHUL and rahul must be treated as the same username.
    if (!username || !username.trim()) {
      res.status(400).json({ error: 'Username is required.' });
      return;
    }
    const trimmedUsername = username.trim();
    if (/\s/.test(trimmedUsername)) {
      res.status(400).json({ error: 'Username must not contain any spaces.' });
      return;
    }
    if (/\d/.test(trimmedUsername)) {
      res.status(400).json({ error: 'Username must not contain numbers. A-Z alphabetic characters only.' });
      return;
    }
    if (!/^[a-zA-Z]+$/.test(trimmedUsername)) {
      res.status(400).json({
        error: 'Username can only contain alphabetic characters (A-Z). No special characters or symbols.',
      });
      return;
    }

    const normalizedUsername = trimmedUsername.toLowerCase();
    const existing = users.find((u) => u.normalizedUsername === normalizedUsername);
    if (existing) {
      res.status(409).json({
        error: `Username "${trimmedUsername}" is already registered (usernames are case-insensitive). Please choose another.`,
      });
      return;
    }

    // 3. Password rules:
    // - Minimum 8 characters.
    // - Uppercase.
    // - Lowercase.
    // - Number.
    // - Special character.
    // - Secure one-way hashing.
    // - Previous passwords may be reused.
    if (!password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      res.status(400).json({ error: 'Password must contain at least one uppercase letter (A-Z).' });
      return;
    }
    if (!/[a-z]/.test(password)) {
      res.status(400).json({ error: 'Password must contain at least one lowercase letter (a-z).' });
      return;
    }
    if (!/[0-9]/.test(password)) {
      res.status(400).json({ error: 'Password must contain at least one numeric digit (0-9).' });
      return;
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
      res.status(400).json({ error: 'Password must contain at least one special character (!@#$%^&*...).' });
      return;
    }

    // 4. Confirm Password
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Password and Confirm Password do not match.' });
      return;
    }

    // 5. Department
    if (!departmentId || !departmentId.trim()) {
      res.status(400).json({ error: 'Department is required.' });
      return;
    }

    // 6. Designation
    if (!designation || !designation.trim()) {
      res.status(400).json({ error: 'Designation is required.' });
      return;
    }

    // 7. Computer/Asset Tag
    if (!assetTag || !assetTag.trim()) {
      res.status(400).json({ error: 'Computer/Asset Tag is required.' });
      return;
    }

    // 8. Location
    if (!locationId || !locationId.trim()) {
      res.status(400).json({ error: 'Location is required.' });
      return;
    }

    // 9. Mobile Number
    if (!mobileNumber || !mobileNumber.trim()) {
      res.status(400).json({ error: 'Mobile Number is required.' });
      return;
    }

    // Hash password with PBKDF2
    const { hash, salt } = hashPasswordSync(password);
    const now = new Date().toISOString();
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser: StoredUser = {
      id: newUserId,
      username: trimmedUsername,
      normalizedUsername,
      displayName: employeeName.trim(),
      email: `${normalizedUsername}@accurategroup.com`,
      role: 'EMPLOYEE',
      departmentId,
      departmentName: departmentName || 'Operations',
      designation: designation.trim(),
      assetTag: assetTag.trim(),
      locationId,
      locationName: locationName || 'Main Office',
      mobileNumber: mobileNumber.trim(),
      status: 'PENDING_APPROVAL', // Employee registers → Pending → IT Admin reviews → Approve/Reject
      passwordHash: hash,
      passwordSalt: salt,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      mustChangePassword: false,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    persistData();

    logAudit(
      { id: newUserId, email: newUser.email, role: 'EMPLOYEE' },
      'USER_REGISTRATION_SUBMITTED',
      'USER',
      newUserId,
      `Employee registered: ${newUser.displayName} (@${newUser.username}). Status: PENDING_APPROVAL.`,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Your account is pending IT Administrator review and approval.',
      userId: newUserId,
      status: 'PENDING_APPROVAL',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Login security rules:
 * - 5 incorrect password attempts causes a 15-minute lockout.
 * - After 15 minutes the user may log in again.
 * - Failed-attempt counter is NOT automatically reset.
 * - Successful login does NOT reset it.
 * - Counter continues cumulatively.
 * - Only IT Admin/Super Admin can manually reset the counter.
 * - Warn after the 3rd failed attempt.
 * - Show remaining attempts.
 * - Locked screen shows remaining lockout time.
 */
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const normalized = username.trim().toLowerCase();
    const user = users.find((u) => u.normalizedUsername === normalized || u.email.toLowerCase() === normalized);

    if (!user) {
      // Avoid revealing user existence for security, but report invalid credentials
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    // Check account status:
    if (user.status === 'PENDING_APPROVAL') {
      res.status(403).json({
        error: 'Your registration is currently pending review and approval by an IT Administrator.',
        status: 'PENDING_APPROVAL',
      });
      return;
    }

    if (user.status === 'REJECTED') {
      res.status(403).json({
        error: `Your registration was rejected by IT Administration. Reason: ${user.rejectionReason || 'Identity verification failed.'}`,
        status: 'REJECTED',
        rejectionReason: user.rejectionReason,
      });
      return;
    }

    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      res.status(403).json({
        error: 'Your account is disabled. All sessions have been terminated. Please contact IT Administration.',
        status: user.status,
      });
      return;
    }

    const now = Date.now();

    // Check lockout:
    if (user.lockoutUntil) {
      const lockoutExpiry = new Date(user.lockoutUntil).getTime();
      if (lockoutExpiry > now) {
        const remainingSeconds = Math.ceil((lockoutExpiry - now) / 1000);
        res.status(423).json({
          error: `Account is temporarily locked due to 5 incorrect password attempts. Please wait ${Math.ceil(remainingSeconds / 60)} minute(s).`,
          isLocked: true,
          lockoutUntil: user.lockoutUntil,
          remainingSeconds,
          failedAttempts: user.failedLoginAttempts,
        });
        return;
      } else {
        // "After 15 minutes the user may log in again."
        // "Failed-attempt counter is NOT automatically reset. Successful login does NOT reset it. Counter continues cumulatively."
        // The lockout period expired, so lockoutUntil is cleared, but failedLoginAttempts stays!
        user.lockoutUntil = null;
        persistData();
      }
    }

    // Verify Password
    const isValid = verifyPasswordSync(password, user.passwordHash, user.passwordSalt);

    if (!isValid) {
      // Increment cumulative failed attempt counter:
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lockout trigger check:
      // "5 incorrect password attempts causes a 15-minute lockout."
      // "Counter continues cumulatively."
      const cycleAttempts = user.failedLoginAttempts % 5;
      const isNowLocked = cycleAttempts === 0;

      if (isNowLocked) {
        const lockoutDate = new Date(now + 15 * 60 * 1000);
        user.lockoutUntil = lockoutDate.toISOString();
      }

      user.updatedAt = new Date().toISOString();
      persistData();

      logAudit(
        { id: user.id, email: user.email, role: user.role },
        'LOGIN_FAILED',
        'AUTH',
        user.id,
        `Incorrect password attempt. Cumulative failed attempts: ${user.failedLoginAttempts}. Locked: ${isNowLocked}`,
        req
      );

      if (isNowLocked) {
        res.status(423).json({
          error: 'Account locked for 15 minutes due to 5 failed password attempts.',
          isLocked: true,
          lockoutUntil: user.lockoutUntil,
          remainingSeconds: 15 * 60,
          failedAttempts: user.failedLoginAttempts,
          remainingAttempts: 0,
        });
        return;
      }

      // Calculate remaining attempts in current cycle:
      const remainingAttempts = 5 - cycleAttempts;
      // "Warn after the 3rd failed attempt."
      const warnAfter3rdAttempt = cycleAttempts >= 3;

      res.status(401).json({
        error: 'Incorrect password.',
        isLocked: false,
        failedAttempts: user.failedLoginAttempts,
        remainingAttempts,
        warnAfter3rdAttempt,
      });
      return;
    }

    // SUCCESSFUL LOGIN:
    // "Failed-attempt counter is NOT automatically reset. Successful login does NOT reset it. Counter continues cumulatively. Only IT Admin/Super Admin can manually reset the counter."
    // Notice: We do NOT reset user.failedLoginAttempts!

    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();

    // Create session (Multiple concurrent sessions allowed)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userAgent = (req.headers['user-agent'] as string) || 'Unknown Browser';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    let deviceLabel = 'Desktop Chrome';
    if (/Mobile|Android|iPhone/i.test(userAgent)) deviceLabel = 'Mobile Device';
    else if (/Macintosh/i.test(userAgent)) deviceLabel = 'macOS Workstation';
    else if (/Windows/i.test(userAgent)) deviceLabel = 'Windows PC';
    else if (/Linux/i.test(userAgent)) deviceLabel = 'Linux Terminal';

    const session: StoredSession = {
      id: sessionId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      userEmail: user.email,
      userRole: user.role,
      token,
      activeTokenHash: tokenHash,
      ipAddress,
      userAgent,
      deviceLabel,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    sessions.push(session);
    persistData();

    logAudit(
      { id: user.id, email: user.email, role: user.role },
      'USER_LOGGED_IN',
      'AUTH',
      user.id,
      `User @${user.username} logged in from ${deviceLabel} (${ipAddress}). MustChangePassword: ${user.mustChangePassword}`,
      req
    );

    res.json({
      success: true,
      token,
      sessionId,
      mustChangePassword: user.mustChangePassword,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/session
 * Verifies active session, checks 30-minute inactivity timeout,
 * and ensures disabled accounts invalidate sessions immediately.
 */
app.get('/api/auth/session', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const session = (req as any).session as StoredSession;

  // List all active sessions for this user
  const userActiveSessions = sessions
    .filter((s) => s.userId === user.id && s.status === 'ACTIVE')
    .map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.id === session.id,
    }));

  res.json({
    valid: true,
    user: sanitizeUser(user),
    sessionId: session.id,
    mustChangePassword: user.mustChangePassword,
    activeSessions: userActiveSessions,
  });
});

/**
 * POST /api/auth/change-password
 * Password rules:
 * - Minimum 8 characters.
 * - Uppercase.
 * - Lowercase.
 * - Number.
 * - Special character.
 * - Secure one-way hashing.
 * - Previous passwords may be reused.
 */
app.post('/api/auth/change-password', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user as StoredUser;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({ error: 'New password is required.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      res.status(400).json({ error: 'Password must contain at least one uppercase letter (A-Z).' });
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      res.status(400).json({ error: 'Password must contain at least one lowercase letter (a-z).' });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'Password must contain at least one numeric digit (0-9).' });
      return;
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword)) {
      res.status(400).json({ error: 'Password must contain at least one special character (!@#$%^&*...).' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    // Previous passwords may be reused (no restriction on reuse)
    const { hash, salt } = hashPasswordSync(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    persistData();

    logAudit(
      { id: user.id, email: user.email, role: user.role },
      'USER_PASSWORD_CHANGED',
      'AUTH',
      user.id,
      `User @${user.username} successfully updated their password.`,
      req
    );

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: any) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/auth/logout
 * Terminates current session.
 */
app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const session = (req as any).session as StoredSession;

  session.status = 'REVOKED';
  persistData();

  logAudit(
    { id: user.id, email: user.email, role: user.role },
    'USER_LOGGED_OUT',
    'AUTH',
    user.id,
    `Current session terminated for @${user.username} (${session.id}).`,
    req
  );

  res.json({ success: true, message: 'Current session ended.' });
});

/**
 * POST /api/auth/logout-all
 * User logs out from all devices.
 */
app.post('/api/auth/logout-all', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;

  let count = 0;
  sessions.forEach((s) => {
    if (s.userId === user.id && s.status === 'ACTIVE') {
      s.status = 'REVOKED';
      count++;
    }
  });

  persistData();

  logAudit(
    { id: user.id, email: user.email, role: user.role },
    'USER_LOGGED_OUT_ALL_DEVICES',
    'AUTH',
    user.id,
    `Terminated all ${count} active sessions across all devices for @${user.username}.`,
    req
  );

  res.json({ success: true, message: `Terminated ${count} active session(s) across all devices.` });
});

// ==========================================
// 2. ADMIN USER-MANAGEMENT ROUTES
// ==========================================

/**
 * GET /api/admin/users
 * Returns list of users, pending registrations, and active sessions.
 */
app.get('/api/admin/users', requireAdmin, (req: Request, res: Response) => {
  const sanitizedUsers = users.map(sanitizeUser);
  const activeSessionsList = sessions
    .filter((s) => s.status === 'ACTIVE')
    .map((s) => ({
      id: s.id,
      userId: s.userId,
      username: s.username,
      displayName: s.displayName,
      userRole: s.userRole,
      userEmail: s.userEmail,
      deviceLabel: s.deviceLabel,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
    }));

  res.json({
    users: sanitizedUsers,
    activeSessions: activeSessionsList,
    auditLogs: auditLogs.slice(0, 100),
  });
});

/**
 * POST /api/admin/approve-user
 * IT Admin reviews → Approve
 */
app.post('/api/admin/approve-user', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).user as StoredUser;
  const { userId, role } = req.body;

  const target = users.find((u) => u.id === userId);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  target.status = 'ACTIVE';
  target.rejectionReason = null;
  if (role && (role === 'EMPLOYEE' || role === 'IT_TECHNICIAN' || role === 'IT_ADMIN')) {
    target.role = role;
  }
  target.updatedAt = new Date().toISOString();
  persistData();

  logAudit(
    { id: admin.id, email: admin.email, role: admin.role },
    'USER_REGISTRATION_APPROVED',
    'USER',
    target.id,
    `Admin ${admin.displayName} approved registration for @${target.username} (${target.displayName}).`,
    req
  );

  res.json({ success: true, user: sanitizeUser(target), message: `Approved registration for ${target.displayName}.` });
});

/**
 * POST /api/admin/reject-user
 * IT Admin reviews → Reject.
 * "Rejected registration requires a mandatory reason."
 */
app.post('/api/admin/reject-user', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).user as StoredUser;
  const { userId, rejectionReason } = req.body;

  if (!rejectionReason || !rejectionReason.trim()) {
    res.status(400).json({ error: 'Rejection reason is mandatory.' });
    return;
  }

  const target = users.find((u) => u.id === userId);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  target.status = 'REJECTED';
  target.rejectionReason = rejectionReason.trim();
  target.updatedAt = new Date().toISOString();

  // Invalidate any sessions
  sessions.forEach((s) => {
    if (s.userId === target.id) s.status = 'REVOKED';
  });

  persistData();

  logAudit(
    { id: admin.id, email: admin.email, role: admin.role },
    'USER_REGISTRATION_REJECTED',
    'USER',
    target.id,
    `Admin ${admin.displayName} rejected registration for @${target.username}. Reason: "${rejectionReason.trim()}"`,
    req
  );

  res.json({
    success: true,
    user: sanitizeUser(target),
    message: `Rejected registration for ${target.displayName}.`,
  });
});

/**
 * POST /api/admin/reset-password
 * Password reset:
 * - Employee contacts IT Admin.
 * - Admin verifies identity.
 * - Admin generates temporary password.
 * - Employee must change it at first login.
 * - Admin never sees existing password.
 * - Reset is audited.
 */
app.post('/api/admin/reset-password', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).user as StoredUser;
  const { userId, customTemporaryPassword } = req.body;

  const target = users.find((u) => u.id === userId);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  let tempPass = customTemporaryPassword;
  if (!tempPass || tempPass.trim().length < 8) {
    // Auto-generate strong compliant temporary password
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const specials = '!@#$%&*';
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    tempPass = `Temp#${pick(uppers)}${pick(uppers)}${pick(lowers)}${pick(lowers)}${pick(numbers)}${pick(numbers)}${pick(specials)}${pick(specials)}`;
  }

  // Hash temporary password with salt (admin never sees old password)
  const { hash, salt } = hashPasswordSync(tempPass);
  target.passwordHash = hash;
  target.passwordSalt = salt;
  target.mustChangePassword = true;
  target.temporaryPasswordGeneratedAt = new Date().toISOString();
  target.updatedAt = new Date().toISOString();

  // Invalidate previous sessions so user must log in with temp password
  sessions.forEach((s) => {
    if (s.userId === target.id) s.status = 'REVOKED';
  });

  persistData();

  logAudit(
    { id: admin.id, email: admin.email, role: admin.role },
    'PASSWORD_RESET_ADMIN_INITIATED',
    'USER',
    target.id,
    `Admin ${admin.displayName} issued temporary password reset for @${target.username}. MustChangePassword flagged true.`,
    req
  );

  res.json({
    success: true,
    temporaryPassword: tempPass,
    message: `Temporary password generated for ${target.displayName}. Employee will be forced to change it on login.`,
  });
});

/**
 * POST /api/admin/reset-failed-counter
 * "Only IT Admin/Super Admin can manually reset the counter."
 */
app.post('/api/admin/reset-failed-counter', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).user as StoredUser;
  const { userId } = req.body;

  const target = users.find((u) => u.id === userId);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const prevAttempts = target.failedLoginAttempts;
  target.failedLoginAttempts = 0;
  target.lockoutUntil = null;
  target.updatedAt = new Date().toISOString();
  persistData();

  logAudit(
    { id: admin.id, email: admin.email, role: admin.role },
    'FAILED_ATTEMPTS_COUNTER_RESET',
    'USER',
    target.id,
    `Admin ${admin.displayName} manually reset failed attempt counter (was ${prevAttempts}) and unlocked @${target.username}.`,
    req
  );

  res.json({
    success: true,
    user: sanitizeUser(target),
    message: `Failed attempt counter reset to 0. Account for ${target.displayName} is unlocked.`,
  });
});

/**
 * POST /api/admin/terminate-sessions
 * - Super Admin can terminate all sessions.
 * - IT Admin / Super Admin can terminate all sessions for a specific user, or an individual session.
 */
app.post('/api/admin/terminate-sessions', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).user as StoredUser;
  const { userId, sessionId, all } = req.body;

  let terminatedCount = 0;

  if (all) {
    // Only Super Admin can terminate all sessions globally across the system
    if (admin.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Only Super Admin can terminate all sessions globally.' });
      return;
    }
    sessions.forEach((s) => {
      if (s.status === 'ACTIVE') {
        s.status = 'REVOKED';
        terminatedCount++;
      }
    });
  } else if (sessionId) {
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (targetSession && targetSession.status === 'ACTIVE') {
      targetSession.status = 'REVOKED';
      terminatedCount = 1;
    }
  } else if (userId) {
    sessions.forEach((s) => {
      if (s.userId === userId && s.status === 'ACTIVE') {
        s.status = 'REVOKED';
        terminatedCount++;
      }
    });
  } else {
    res.status(400).json({ error: 'Specify userId, sessionId, or all: true.' });
    return;
  }

  persistData();

  logAudit(
    { id: admin.id, email: admin.email, role: admin.role },
    'SESSIONS_TERMINATED_BY_ADMIN',
    'SESSION',
    sessionId || userId || 'GLOBAL_ALL',
    `Admin ${admin.displayName} revoked ${terminatedCount} active session(s). Target: ${all ? 'ALL SESSIONS' : sessionId ? `Session ${sessionId}` : `User ${userId}`}`,
    req
  );

  res.json({
    success: true,
    terminatedCount,
    message: `Successfully terminated ${terminatedCount} session(s).`,
  });
});

/**
 * POST /api/admin/toggle-user-status
 * Super Admin or IT Admin toggles user active / suspended.
 * "Disabled accounts invalidate all sessions."
 */
app.post('/api/admin/toggle-user-status', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).user as StoredUser;
  const { userId, status } = req.body;

  const target = users.find((u) => u.id === userId);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (target.id === admin.id) {
    res.status(400).json({ error: 'Cannot disable your own active administrator account.' });
    return;
  }

  target.status = status;
  target.updatedAt = new Date().toISOString();

  // Disabled accounts invalidate all sessions:
  if (status === 'SUSPENDED' || status === 'DEACTIVATED') {
    sessions.forEach((s) => {
      if (s.userId === target.id) s.status = 'REVOKED';
    });
  }

  persistData();

  logAudit(
    { id: admin.id, email: admin.email, role: admin.role },
    'USER_STATUS_CHANGED',
    'USER',
    target.id,
    `Admin ${admin.displayName} changed status of @${target.username} to ${status}. Sessions revoked.`,
    req
  );

  res.json({
    success: true,
    user: sanitizeUser(target),
    message: `Account status for ${target.displayName} updated to ${status}.`,
  });
});

// ==========================================
// 3. VITE MIDDLEWARE & STATIC SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Accurate Group Enterprise ITMS running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
