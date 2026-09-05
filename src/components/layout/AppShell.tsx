import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, NavSection } from './Sidebar';
import { ArchitectureOverview } from '../dashboard/ArchitectureOverview';
import { MasterDataManager } from '../admin/MasterDataManager';
import { AuditLogViewer } from '../audit/AuditLogViewer';
import { SchemaInspector } from '../schema/SchemaInspector';
import { UserManagementView } from '../admin/UserManagementView';
import { AuthModal } from '../auth/AuthModal';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { SessionManagerModal } from '../auth/SessionManagerModal';
import { InactivityWarningModal } from '../auth/InactivityWarningModal';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { LogIn, ShieldAlert, Ticket, Laptop, UserPlus, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const AppShell: React.FC = () => {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const { user, profile, isLoading, openAuthModal } = useAuth();

  const isAuthenticated = !!(user || profile);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Header />

      {/* Guest Authentication Banner */}
      {!isAuthenticated && !isLoading && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-amber-300">Enterprise Authentication Active:</strong> Sign in with your Accurate Group employee credentials or submit a new employee registration for IT Admin review.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openAuthModal('REGISTER')}
                icon={UserPlus}
                className="font-semibold rounded-xl text-xs"
              >
                Register (9 Fields)
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openAuthModal('LOGIN')}
                icon={LogIn}
                className="font-semibold rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
        />

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {activeSection === 'overview' && (
            <ArchitectureOverview
              onNavigate={(section) => setActiveSection(section as NavSection)}
            />
          )}

          {activeSection === 'users' && <UserManagementView />}

          {activeSection === 'schema' && <SchemaInspector />}

          {activeSection === 'master_data' && <MasterDataManager />}

          {activeSection === 'audit_logs' && <AuditLogViewer />}

          {activeSection === 'tickets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    IT Support Helpdesk Tickets
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Ticketing subsystem architecture schema and dispatch models.
                  </p>
                </div>
                <Badge variant="purple">Foundation Active</Badge>
              </div>

              <Card
                title="Ticketing Lifecycle Foundation"
                subtitle="Data structures and RBAC ready for business feature rollout"
              >
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    The ticketing subsystem is built on top of the established multi-company independent master data architecture:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
                    <li>Tickets reference independent Company ID and Location ID</li>
                    <li>
                      <strong>Employee</strong> role can submit tickets and view their submitted tickets
                    </li>
                    <li>
                      <strong>IT Technician</strong> role can update ticket progress, add internal troubleshooting notes, and mark resolutions
                    </li>
                    <li>
                      <strong>IT Admin</strong> & <strong>Super Admin</strong> roles can reassign tickets, alter priorities, and configure SLAs
                    </li>
                  </ul>
                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Master data, RBAC, and audit logging foundations are all ready to receive ticket feature implementations.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'inventory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Computer Inventory Management
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Decoupled asset tracking architecture linked to independent companies and facilities.
                  </p>
                </div>
                <Badge variant="info">Foundation Active</Badge>
              </div>

              <Card
                title="Hardware & Asset Tracking Foundation"
                subtitle="Data schema and location decoupling"
              >
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    Inventory items are linked independently to any master company and any master location:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
                    <li>Asset tagging: Desktops, Laptops, Workstations, Monitors, Peripherals</li>
                    <li>Specifications: CPU, RAM, Storage, Serial Numbers, MAC Addresses</li>
                    <li>Allocation status: In-Stock, Assigned, In-Repair, Decommissioned</li>
                    <li>Full integration with independent locations (e.g. NYC-HQ, SFO-TC, LON-EB)</li>
                  </ul>
                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Master data, RBAC, and audit logging foundations are all ready to receive inventory feature implementations.
                  </p>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Enterprise Security Modals */}
      <AuthModal />
      <ChangePasswordModal />
      <SessionManagerModal />
      <InactivityWarningModal />
    </div>
  );
};
