

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Screen, NavigateTo, AnalysisReport, User, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, FeedbackReason, Finding, KnowledgeCategory, Workspace, WorkspaceMember, UserRole, CustomRegulation } from './types';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import WorkspaceDashboard from './screens/WorkspaceDashboard';
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
                <strong>Action Required:</strong> Please add the `API_KEY` environment variable in your Netlify site settings under "Site configuration" &gt; "Build &amp; deploy" &gt; "Environment" and then trigger a new deploy.
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

const App: React.FC = () => {
  // --- FAIL-FAST CHECK ---
  // This is the most critical part of the fix. We check for the environment
  // variable immediately. If it's missing, we render *only* the error screen
  // and none of the other application logic runs, preventing a crash.
  if (!process.env.API_KEY) {
    return <ErrorScreen message="The 'API_KEY' environment variable is not set. This key is required to communicate with the Google Gemini API." />;
  }
  
  const { user: currentUser, loading, logout: handleLogout } = useAuth();

  const [screen, setScreen] = useState<Screen>(Screen.WorkspaceDashboard);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('Member');
  
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

  const navigateTo: NavigateTo = (newScreen: Screen) => {
    setScreen(newScreen);
  };
  
  const loadWorkspaceData = useCallback(async (workspaceId: string) => {
    if (!currentUser) return;
    const data = await workspaceApi.getWorkspaceData(workspaceId, currentUser.email);
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
    const userWorkspaces = await workspaceApi.getWorkspacesForUser(currentUser.email);
    setWorkspaces(userWorkspaces);
    knownWorkspaceIds.current = new Set(userWorkspaces.map(ws => ws.id));
  }, [currentUser]);

  const handleBackToWorkspaces = () => {
    setSelectedWorkspace(null);
    setActiveReport(null);
    navigateTo(Screen.WorkspaceDashboard);
  };

  useEffect(() => {
    if (currentUser) {
      refreshWorkspaces();
      if(selectedWorkspace) {
        handleBackToWorkspaces();
      }
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
      setScreen(Screen.WorkspaceDashboard);
      knownWorkspaceIds.current.clear();
    }
  }, [currentUser, refreshWorkspaces]);

  // Poll for new workspaces
  useEffect(() => {
      if (!currentUser) return;

      const intervalId = setInterval(async () => {
          const currentWorkspaces = await workspaceApi.getWorkspacesForUser(currentUser.email);
          const newWorkspaces = currentWorkspaces.filter(ws => !knownWorkspaceIds.current.has(ws.id));

          if (newWorkspaces.length > 0) {
              const newWorkspace = newWorkspaces[0];
              await refreshWorkspaces(); // Refresh the list automatically
              setNotification({
                  message: `You've been added to a new workspace!`,
                  workspaceName: newWorkspace.name,
              });
          }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(intervalId);
  }, [currentUser, refreshWorkspaces]);
  
  const addAuditLog = useCallback(async (action: AuditLogAction, details: string) => {
    if(!currentUser || !selectedWorkspace) return;
    await workspaceApi.addAuditLog(selectedWorkspace.id, currentUser.email, action, details);
    loadWorkspaceData(selectedWorkspace.id);
  }, [currentUser, selectedWorkspace, loadWorkspaceData]);

  const handleCreateWorkspace = async (name: string) => {
    if (!currentUser) return;
    try {
        await workspaceApi.createWorkspace(name, currentUser);
        await refreshWorkspaces();
        setCreateWorkspaceModalOpen(false);
    } catch (error) {
        console.error("Failed to create workspace:", error);
        // Re-throw the error for the modal to catch and display
        throw error;
    }
  };

  const handleSelectWorkspace = async (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    await loadWorkspaceData(workspace.id);
    navigateTo(Screen.Dashboard);
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
    await workspaceApi.addReport(newReport);
    await addAuditLog('Analysis Run', `Analysis completed for: ${report.title}`);
    await loadWorkspaceData(selectedWorkspace.id);
    const fullReport = (await workspaceApi.getWorkspaceData(selectedWorkspace.id, currentUser!.email)).reports[0];
    setActiveReport(fullReport);
  };

  const addKnowledgeSource = async (title: string, content: string, category: KnowledgeCategory) => {
    if (!selectedWorkspace) return;
    await workspaceApi.addKnowledgeSource(selectedWorkspace.id, { title, content, category, isEditable: true });
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleAddAutomatedSource = () => {
    alert("This feature is coming soon!\nIt will automatically scan and add relevant government regulations to your knowledge base.");
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

  const handleRemoveUser = async (email: string) => {
      if (!selectedWorkspace) return;
      await workspaceApi.removeUser(selectedWorkspace.id, email);
      await addAuditLog('User Removed', `Removed user ${email}.`);
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
    await addAuditLog(action, `Report "${report?.title}" status changed to ${status}.`);
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!selectedWorkspace) return;
    const report = reports.find(r => r.id === reportId);
    await workspaceApi.deleteReport(reportId);
    await addAuditLog('Analysis Deleted', `Report "${report?.title}" was permanently deleted.`);
    await loadWorkspaceData(selectedWorkspace.id);
  };

  const renderScreen = () => {
    if (loading) return <InitializingScreen />;
    if (!currentUser) return <LoginScreen />;

    if (!selectedWorkspace) {
        return (
            <>
                <WorkspaceDashboard 
                    workspaces={workspaces}
                    onSelectWorkspace={handleSelectWorkspace}
                    onCreateWorkspace={() => setCreateWorkspaceModalOpen(true)}
                    currentUser={currentUser}
                    onLogout={handleLogout}
                />
                {isCreateWorkspaceModalOpen && (
                    <CreateWorkspaceModal 
                        onClose={() => setCreateWorkspaceModalOpen(false)}
                        onCreate={handleCreateWorkspace}
                    />
                )}
            </>
        );
    }

    const layoutProps = {
        navigateTo,
        currentUser,
        onLogout: handleLogout,
        currentWorkspace: selectedWorkspace,
        onBackToWorkspaces: handleBackToWorkspaces,
        onManageMembers: () => setManageMembersModalOpen(true),
        userRole,
    };

    let screenComponent: React.ReactNode;

    switch (screen) {
      case Screen.Dashboard:
        screenComponent = <DashboardScreen {...layoutProps} reports={reports} onSelectReport={handleSelectReport} onStartNewAnalysis={handleStartNewAnalysis} onUpdateReportStatus={handleUpdateReportStatus} onDeleteReport={handleDeleteReport} />;
        break;
      case Screen.Analysis:
        screenComponent = <AnalysisScreen {...layoutProps} activeReport={activeReport} onAnalysisComplete={handleAnalysisComplete} addAuditLog={addAuditLog} knowledgeBaseSources={knowledgeBaseSources} dismissalRules={dismissalRules} onAddDismissalRule={addDismissalRule} customRegulations={customRegulations} />;
        break;
      case Screen.AuditTrail:
        screenComponent = <AuditTrailScreen {...layoutProps} logs={auditLogs} />;
        break;
      case Screen.KnowledgeBase:
        screenComponent = <KnowledgeBaseScreen {...layoutProps} sources={knowledgeBaseSources} onAddSource={addKnowledgeSource} onDeleteSource={deleteKnowledgeSource} onAddAutomatedSource={handleAddAutomatedSource} />;
        break;
      case Screen.Settings:
        screenComponent = <SettingsScreen {...layoutProps} dismissalRules={dismissalRules} onDeleteDismissalRule={deleteDismissalRule} onUserUpdate={handleUserUpdate} customRegulations={customRegulations} onAddRegulation={handleAddRegulation} onDeleteRegulation={handleDeleteRegulation} />;
        break;
      default:
        screenComponent = <DashboardScreen {...layoutProps} reports={reports} onSelectReport={handleSelectReport} onStartNewAnalysis={handleStartNewAnalysis} onUpdateReportStatus={handleUpdateReportStatus} onDeleteReport={handleDeleteReport} />;
    }

    return (
        <>
            {screenComponent}
            {isManageMembersModalOpen && selectedWorkspace && currentUser && (
                <ManageMembersModal 
                    onClose={() => setManageMembersModalOpen(false)}
                    currentMembers={workspaceMembers}
                    currentUserEmail={currentUser.email}
                    onInviteUser={handleInviteUser}
                    onRemoveUser={handleRemoveUser}
                    onUpdateRole={handleUpdateRole}
                />
            )}
        </>
    );
  };

  return (
    <div className="font-sans bg-vesta-bg-light dark:bg-vesta-bg-dark min-h-screen text-vesta-text-light dark:text-vesta-text-dark">
        {notification && (
            <NotificationToast 
                message={notification.message}
                workspaceName={notification.workspaceName}
                onClose={() => setNotification(null)}
            />
        )}
      {renderScreen()}
    </div>
  );
}

export default App;