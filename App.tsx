

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Screen, NavigateTo, AnalysisReport, User, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, FeedbackReason, Finding, KnowledgeCategory, Workspace, WorkspaceMember, UserRole, CustomRegulation, WorkspaceInvitation } from './types';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import AuditTrailScreen from './screens/AuditTrailScreen';
import KnowledgeBaseScreen from './screens/KnowledgeBaseScreen';
import SettingsScreen from './screens/SettingsScreen';
import CreateWorkspaceModal from './components/CreateWorkspaceModal';
import ManageMembersModal from './components/ManageMembersModal';
import * as workspaceApi from './api/workspace';
import { AlertTriangleIcon } from './components/Icons';
import NotificationToast from './components/NotificationToast';
import { Layout } from './components/Layout';
import WorkspaceDashboard from './screens/WorkspaceDashboard';

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-vesta-bg-light dark:bg-vesta-bg-dark p-4 text-center">
        <div className="max-w-2xl bg-vesta-card-light dark:bg-vesta-card-dark p-8 rounded-lg shadow-lg border border-vesta-red">
            <AlertTriangleIcon className="w-16 h-16 mx-auto text-vesta-red" />
            <h1 className="text-2xl font-bold text-vesta-red dark:text-vesta-gold mt-4">Application Configuration Error</h1>
            <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-2">
                The application cannot start because a required configuration is missing.
            </p>
            <div className="mt-4 p-4 bg-vesta-red/10 rounded-md text-left">
                <p className="font-mono text-sm text-vesta-red">{message}</p>
            </div>
            <p className="text-xs text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mt-6">
                <strong>Action Required:</strong> Please add the `API_KEY` environment variable in your Netlify site settings under "Site configuration" {'>'} "Build & deploy" {'>'} "Environment" and then trigger a new deploy.
            </p>
        </div>
    </div>
);


const InitializingScreen: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-vesta-bg-light dark:bg-vesta-bg-dark">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-vesta-red"></div>
        <p className="mt-4 text-lg font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
            Initializing Session...
        </p>
    </div>
);

const defaultGovSources = [
    {
      title: "Bangko Sentral ng Pilipinas (BSP) Regulations",
      content: "A collection of circulars, memoranda, and guidelines from the BSP, governing banks, financial institutions, and payment systems in the Philippines. Official source: https://www.bsp.gov.ph/",
      category: KnowledgeCategory.Government,
      isEditable: true,
    },
    {
      title: "Bureau of Internal Revenue (BIR) Issuances",
      content: "Regulations concerning taxation of financial transactions, digital services, and corporate income. Official source: https://www.bir.gov.ph/",
      category: KnowledgeCategory.Government,
      isEditable: true,
    },
    {
      title: "Philippine Deposit Insurance Corporation (PDIC) Rules",
      content: "Rules and regulations governing deposit insurance, bank resolutions, and financial stability. Official source: https://www.pdic.gov.ph/",
      category: KnowledgeCategory.Government,
      isEditable: true,
    },
    {
      title: "National Privacy Commission (NPC) Advisories",
      content: "Guidelines and advisories related to the Data Privacy Act of 2012 (RA 10173). Official source: https://www.privacy.gov.ph/",
      category: KnowledgeCategory.Government,
      isEditable: true,
    },
    {
      title: "Philippine Insurance Regulations (PIR)",
      content: "Regulations from the Insurance Commission governing insurance products, operations, and market conduct. Official source: https://www.insurance.gov.ph/",
      category: KnowledgeCategory.Government,
      isEditable: true,
    },
    {
      title: "Securities and Exchange Commission (SEC) Memoranda",
      content: "Memorandum Circulars from the SEC covering corporate governance, securities registration, and investment products. Official source: https://www.sec.gov.ph/",
      category: KnowledgeCategory.Government,
      isEditable: true,
    },
];

const App: React.FC = () => {
  // --- FAIL-FAST CHECK ---
  if (!process.env.API_KEY) {
    return <ErrorScreen message="The 'API_KEY' environment variable is not set. This key is required to communicate with the Google Gemini API." />;
  }
  
  const { user: currentUser, loading, logout: handleLogout } = useAuth();

  const [screen, setScreen] = useState<Screen>(Screen.Dashboard);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('Member');
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  
  // Data scoped to the selected workspace
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [knowledgeBaseSources, setKnowledgeBaseSources] = useState<KnowledgeSource[]>([]);
  const [dismissalRules, setDismissalRules] = useState<DismissalRule[]>([]);
  const [customRegulations, setCustomRegulations] = useState<CustomRegulation[]>([]);
  
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  
  // Modal State
  const [isCreateWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);
  const [isManageMembersModalOpen, setManageMembersModalOpen] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState<{ message: string; workspaceName: string } | null>(null);
  const knownWorkspaceIds = useRef(new Set<string>());

  // Loading State
  const [isSyncingSources, setIsSyncingSources] = useState(false);

  // Global Theme Persistence Fix
  useEffect(() => {
    const handleThemeChange = () => {
      if (localStorage.getItem('vesta-theme') === 'dark' || (!('vesta-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    // Listen for changes from other tabs/windows
    window.addEventListener('storage', handleThemeChange);
    // Apply theme on initial load
    handleThemeChange();

    return () => {
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const navigateTo: NavigateTo = (newScreen: Screen) => {
    setScreen(newScreen);
  };
  
  const loadWorkspaceData = useCallback(async (workspaceId: string) => {
    if (!currentUser) return;
    const data = await workspaceApi.getWorkspaceData(workspaceId);
    setReports(data.reports);
    setAuditLogs(data.auditLogs);
    setKnowledgeBaseSources(data.knowledgeBaseSources);
    setDismissalRules(data.dismissalRules);
    setCustomRegulations(data.customRegulations);
    
    const members = await workspaceApi.getWorkspaceMembers(workspaceId);
    setWorkspaceMembers(members);
    const member = members.find(m => m.email === currentUser.email);
    setUserRole(member?.role || 'Member');
  }, [currentUser]);

  const refreshWorkspaces = useCallback(async () => {
    if (!currentUser) return;
    const userWorkspaces = await workspaceApi.getWorkspacesForUser();
    setWorkspaces(userWorkspaces);
    knownWorkspaceIds.current = new Set(userWorkspaces.map(ws => ws.id));
  }, [currentUser]);

  const refreshInvitations = useCallback(async () => {
      if (!currentUser) return;
      const pendingInvitations = await workspaceApi.getPendingInvitations();
      setInvitations(pendingInvitations);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshWorkspaces();
      refreshInvitations();
    } else {
      // Clear all state when user logs out
      setWorkspaces([]);
      setSelectedWorkspace(null);
      setReports([]);
      setAuditLogs([]);
      setKnowledgeBaseSources([]);
      setDismissalRules([]);
      setCustomRegulations([]);
      setActiveReport(null);
      setInvitations([]);
      knownWorkspaceIds.current.clear();
    }
  }, [currentUser, refreshWorkspaces, refreshInvitations]);

  // Poll for new workspaces (from invitations being accepted)
  useEffect(() => {
      if (!currentUser) return;

      const intervalId = setInterval(async () => {
          const currentWorkspaces = await workspaceApi.getWorkspacesForUser();
          const newWorkspaces = currentWorkspaces.filter(ws => !knownWorkspaceIds.current.has(ws.id));

          if (newWorkspaces.length > 0) {
              const newWorkspace = newWorkspaces[0];
              await refreshWorkspaces(); // Refresh the list automatically
              setNotification({
                  message: `You've been added to a new workspace!`,
                  workspaceName: newWorkspace.name,
              });
          }
          // Also poll for new invitations
          refreshInvitations();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(intervalId);
  }, [currentUser, refreshWorkspaces, refreshInvitations]);
  
  const addAuditLog = useCallback(async (action: AuditLogAction, details: string) => {
    if(!currentUser || !selectedWorkspace) return;
    await workspaceApi.addAuditLog(selectedWorkspace.id, currentUser.email, action, details);
    loadWorkspaceData(selectedWorkspace.id);
  }, [currentUser, selectedWorkspace, loadWorkspaceData]);

  const handleCreateWorkspace = async (name: string) => {
    if (!currentUser) return;
    try {
        const newWorkspace = await workspaceApi.createWorkspace(name);
        await refreshWorkspaces();
        setCreateWorkspaceModalOpen(false);
        await handleSelectWorkspace(newWorkspace); // Auto-select the new workspace
    } catch (error) {
        console.error("Failed to create workspace:", error);
        throw error;
    }
  };

  const handleSelectWorkspace = async (workspace: Workspace) => {
    if(selectedWorkspace?.id === workspace.id) return;
    setSelectedWorkspace(workspace);
    await loadWorkspaceData(workspace.id);
    setActiveReport(null);
    navigateTo(Screen.Dashboard);
  };

  const handleBackToWorkspaces = () => {
    setSelectedWorkspace(null);
    setReports([]);
    setAuditLogs([]);
    setKnowledgeBaseSources([]);
    setDismissalRules([]);
    setCustomRegulations([]);
    setActiveReport(null);
  };

  const handleStartNewAnalysis = () => {
    setActiveReport(null);
    navigateTo(Screen.Analysis);
  };

  const handleSelectReport = (report: AnalysisReport) => {
    setActiveReport(report);
    navigateTo(Screen.Analysis);
  };

  const handleAnalysisComplete = async (report: AnalysisReport) => {
    if (!selectedWorkspace) return;
    const newReport = { ...report, workspaceId: selectedWorkspace.id };
    const addedReport = await workspaceApi.addReport(newReport);
    await addAuditLog('Analysis Run', JSON.stringify({ message: `Analysis completed for: ${report.title}`, reportId: addedReport.id }));
    await loadWorkspaceData(selectedWorkspace.id);
    setActiveReport(addedReport);
  };

  const handleUpdateReport = async (updatedReport: AnalysisReport) => {
      try {
          const savedReport = await workspaceApi.updateReport(updatedReport);
          setReports(prevReports => prevReports.map(r => r.id === savedReport.id ? savedReport : r));
          setActiveReport(savedReport);
      } catch (error) {
          console.error("Failed to update report:", error);
          alert((error as Error).message);
      }
  };

  const addKnowledgeSource = async (title: string, content: string, category: KnowledgeCategory) => {
    if (!selectedWorkspace) return;
    await workspaceApi.addKnowledgeSource(selectedWorkspace.id, { title, content, category, isEditable: true });
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleAddAutomatedSource = async () => {
    if (!selectedWorkspace || isSyncingSources) return;

    setIsSyncingSources(true);
    try {
        const existingTitles = new Set(knowledgeBaseSources.map(s => s.title));
        const missingSources = defaultGovSources.filter(ds => !existingTitles.has(ds.title));

        if (missingSources.length === 0) {
            alert("All default government sources are already in your knowledge base.");
            return;
        }

        const addPromises = missingSources.map(source => 
            workspaceApi.addKnowledgeSource(selectedWorkspace.id, source)
        );

        await Promise.all(addPromises);
        
        await loadWorkspaceData(selectedWorkspace.id);
        alert(`Successfully added ${missingSources.length} missing government source(s).`);

    } catch (error) {
        console.error("Failed to add automated sources:", error);
        alert(`Error: ${error instanceof Error ? error.message : 'Could not sync sources.'}`);
    } finally {
        setIsSyncingSources(false);
    }
  };

  const deleteKnowledgeSource = async (id: string) => {
    if (!selectedWorkspace) return;
    await workspaceApi.deleteKnowledgeSource(selectedWorkspace.id, id);
    await loadWorkspaceData(selectedWorkspace.id);
  };
  
  const addDismissalRule = async (finding: Finding, reason: FeedbackReason) => {
    if (!selectedWorkspace) return;
    await workspaceApi.addDismissalRule(selectedWorkspace.id, { findingTitle: finding.title, reason });
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const deleteDismissalRule = async (id: string) => {
    if (!selectedWorkspace) return;
    await workspaceApi.deleteDismissalRule(selectedWorkspace.id, id);
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleAddRegulation = async (ruleText: string) => {
      if (!selectedWorkspace || !currentUser) return;
      await workspaceApi.addCustomRegulation(selectedWorkspace.id, ruleText, currentUser.email);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleDeleteRegulation = async (regulationId: string) => {
      if (!selectedWorkspace) return;
      await workspaceApi.deleteCustomRegulation(selectedWorkspace.id, regulationId);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
        await workspaceApi.updateUser(updatedUser);
        alert("Profile updated. Note: some changes from Netlify may override this on your next session.");
    } catch(err) {
        console.error("Failed to update user:", err);
    }
  };
  
  const handleInviteUser = async (email: string, role: UserRole) => {
      if (!selectedWorkspace) return;
      try {
          await workspaceApi.inviteUser(selectedWorkspace.id, email, role);
          await addAuditLog('User Invited', `Invited ${email} as ${role}.`);
          await loadWorkspaceData(selectedWorkspace.id); // Refresh member list
      } catch (error) {
          alert((error as Error).message);
      }
  };

  const handleRemoveUser = async (email: string, status: 'active' | 'pending') => {
      if (!selectedWorkspace) return;
      await workspaceApi.removeUser(selectedWorkspace.id, email);
      const action = status === 'active' ? 'User Removed' : 'Invitation Revoked';
      const details = status === 'active' ? `Removed user ${email}.` : `Revoked invitation for ${email}.`;
      await addAuditLog(action, details);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleUpdateRole = async (email: string, role: UserRole) => {
      if (!selectedWorkspace) return;
      await workspaceApi.updateUserRole(selectedWorkspace.id, email, role);
      await addAuditLog('Role Changed', `Changed role for ${email} to ${role}.`);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'active' | 'archived') => {
    if (!selectedWorkspace) return;
    await workspaceApi.updateReportStatus(reportId, status);
    const report = reports.find(r => r.id === reportId);
    const action: AuditLogAction = status === 'archived' ? 'Analysis Archived' : 'Analysis Unarchived';
    await addAuditLog(action, JSON.stringify({ message: `Report "${report?.title}" status changed to ${status}.`, reportId: reportId }));
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!selectedWorkspace) return;
    const report = reports.find(r => r.id === reportId);
    await workspaceApi.deleteReport(reportId);
    await addAuditLog('Analysis Deleted', JSON.stringify({ message: `Report "${report?.title}" was permanently deleted.`, reportId: reportId }));
    await loadWorkspaceData(selectedWorkspace.id);
  };
  
  const handleUpdateWorkspaceName = async (workspaceId: string, name: string) => {
    try {
        await workspaceApi.updateWorkspaceName(workspaceId, name);
        setSelectedWorkspace(prev => prev ? { ...prev, name } : null);
        setWorkspaces(prev => prev.map(ws => ws.id === workspaceId ? { ...ws, name } : ws));
        await loadWorkspaceData(workspaceId);
    } catch (error) {
        console.error("Failed to update workspace name:", error);
        alert((error as Error).message);
        refreshWorkspaces(); // Revert on error
    }
  };

  const handleRespondToInvitation = async (workspaceId: string, response: 'accept' | 'decline') => {
    try {
        await workspaceApi.respondToInvitation(workspaceId, response);
        await refreshInvitations();
        if (response === 'accept') {
            await refreshWorkspaces();
        }
    } catch (error) {
        alert((error as Error).message);
    }
  };

  const renderScreenComponent = () => {
    const layoutProps = {
        navigateTo,
        currentUser: currentUser!,
        onLogout: handleLogout,
        currentWorkspace: selectedWorkspace!,
        onManageMembers: () => setManageMembersModalOpen(true),
        userRole,
        onBackToWorkspaces: handleBackToWorkspaces,
    };

    switch (screen) {
      case Screen.Dashboard:
        return <DashboardScreen {...layoutProps} reports={reports} onSelectReport={handleSelectReport} onStartNewAnalysis={handleStartNewAnalysis} onUpdateReportStatus={handleUpdateReportStatus} onDeleteReport={handleDeleteReport} />;
      case Screen.Analysis:
        return <AnalysisScreen {...layoutProps} activeReport={activeReport} onAnalysisComplete={handleAnalysisComplete} onUpdateReport={handleUpdateReport} addAuditLog={addAuditLog} knowledgeBaseSources={knowledgeBaseSources} customRegulations={customRegulations} />;
      case Screen.AuditTrail:
        return <AuditTrailScreen {...layoutProps} logs={auditLogs} reports={reports} onSelectReport={handleSelectReport} />;
      case Screen.KnowledgeBase:
        return <KnowledgeBaseScreen {...layoutProps} sources={knowledgeBaseSources} onAddSource={addKnowledgeSource} onDeleteSource={deleteKnowledgeSource} onAddAutomatedSource={handleAddAutomatedSource} isSyncing={isSyncingSources} />;
      case Screen.Settings:
        return <SettingsScreen {...layoutProps} dismissalRules={dismissalRules} onDeleteDismissalRule={deleteDismissalRule} onUserUpdate={handleUserUpdate} customRegulations={customRegulations} onAddRegulation={handleAddRegulation} onDeleteRegulation={handleDeleteRegulation} />;
      default:
        return <DashboardScreen {...layoutProps} reports={reports} onSelectReport={handleSelectReport} onStartNewAnalysis={handleStartNewAnalysis} onUpdateReportStatus={handleUpdateReportStatus} onDeleteReport={handleDeleteReport} />;
    }
  };

  if (loading) return <InitializingScreen />;
  if (!currentUser) return <LoginScreen />;

  if (!selectedWorkspace) {
      return (
          <>
            <WorkspaceDashboard
                workspaces={workspaces}
                currentUser={currentUser}
                onSelectWorkspace={handleSelectWorkspace}
                onCreateWorkspace={() => setCreateWorkspaceModalOpen(true)}
                onLogout={handleLogout}
                invitations={invitations}
                onRespondToInvitation={handleRespondToInvitation}
            />
            {isCreateWorkspaceModalOpen && (
                <CreateWorkspaceModal 
                    onClose={() => setCreateWorkspaceModalOpen(false)}
                    onCreate={handleCreateWorkspace}
                />
            )}
            {notification && (
                <NotificationToast 
                    message={notification.message}
                    workspaceName={notification.workspaceName}
                    onClose={() => setNotification(null)}
                />
            )}
          </>
      );
  }

  return (
    <div className="font-sans bg-vesta-bg-light dark:bg-vesta-bg-dark min-h-screen text-vesta-text-light dark:text-vesta-text-dark">
        {notification && (
            <NotificationToast 
                message={notification.message}
                workspaceName={notification.workspaceName}
                onClose={() => setNotification(null)}
            />
        )}
        {isCreateWorkspaceModalOpen && (
            <CreateWorkspaceModal 
                onClose={() => setCreateWorkspaceModalOpen(false)}
                onCreate={handleCreateWorkspace}
            />
        )}
        {isManageMembersModalOpen && (
            <ManageMembersModal 
                onClose={() => setManageMembersModalOpen(false)}
                currentMembers={workspaceMembers}
                currentUserEmail={currentUser.email}
                onInviteUser={handleInviteUser}
                onRemoveUser={handleRemoveUser}
                onUpdateRole={handleUpdateRole}
            />
        )}
        <Layout
            navigateTo={navigateTo}
            activeScreen={screen}
            currentUser={currentUser}
            onLogout={handleLogout}
            currentWorkspace={selectedWorkspace}
            onManageMembers={() => setManageMembersModalOpen(true)}
            userRole={userRole}
            onBackToWorkspaces={handleBackToWorkspaces}
        >
            {renderScreenComponent()}
        </Layout>
    </div>
  );
}

export default App;