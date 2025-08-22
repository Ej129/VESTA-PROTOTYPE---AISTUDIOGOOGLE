

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Screen, NavigateTo, AnalysisReport, User, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, FeedbackReason, Finding, KnowledgeCategory, Workspace, WorkspaceMember, UserRole, CustomRegulation, WorkspaceInvitation } from './types';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import UploadScreen from './screens/UploadScreen';
import AnalysisScreen from './screens/AnalysisScreen';
import AuditTrailScreen from './screens/AuditTrailScreen';
import SettingsScreen from './screens/SettingsScreen';
import CreateWorkspaceModal from './components/CreateWorkspaceModal';
import ManageMembersModal from './components/ManageMembersModal';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import UploadModal from './components/UploadModal';
import * as workspaceApi from './api/workspace';
import { AlertTriangleIcon, BriefcaseIcon } from './components/Icons';
import NotificationToast from './components/NotificationToast';
import { Layout } from './components/Layout';
import * as vestaApi from './api/vesta';

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4 text-center">
        <div className="max-w-2xl bg-white dark:bg-neutral-900 p-8 rounded-lg shadow-lg border border-red-700">
            <AlertTriangleIcon className="w-16 h-16 mx-auto text-red-700" />
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-600 mt-4">Application Configuration Error</h1>
            <p className="text-gray-500 dark:text-neutral-400 mt-2">
                The application cannot start because a required configuration is missing.
            </p>
            <div className="mt-4 p-4 bg-red-700/10 rounded-md text-left">
                <p className="font-mono text-sm text-red-700">{message}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-6">
                <strong>Action Required:</strong> Please add the `API_KEY` environment variable in your Netlify site settings under "Site configuration" {'>'} "Build & deploy" {'>'} "Environment" and then trigger a new deploy.
            </p>
        </div>
    </div>
);


const InitializingScreen: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-700"></div>
        <p className="mt-4 text-lg font-semibold text-gray-500 dark:text-neutral-400">
            Initializing Session...
        </p>
    </div>
);

const NoWorkspaceSelectedScreen: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BriefcaseIcon className="w-16 h-16 text-gray-300 dark:text-neutral-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-200">No Workspace Selected</h2>
        <p className="text-gray-500 dark:text-neutral-400 mt-2 max-w-sm">
            Please select a workspace from the sidebar to view its content, or create a new one to get started.
        </p>
        <button
            onClick={onCreate}
            className="mt-6 bg-red-700 text-white font-bold py-2 px-5 rounded-lg transition-all duration-200 inline-flex items-center shadow-sm hover:shadow-md hover:bg-red-800"
        >
            Create Your First Workspace
        </button>
    </div>
);

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
  const [isKnowledgeBaseModalOpen, setKnowledgeBaseModalOpen] = useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState<{ message: string; workspaceName: string } | null>(null);
  const knownWorkspaceIds = useRef(new Set<string>());

  // Loading State
  const [isSyncingSources, setIsSyncingSources] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Global Theme Persistence Fix
  useEffect(() => {
    const handleThemeChange = () => {
      if (localStorage.getItem('vesta-theme') === 'dark' || (!('vesta-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    window.addEventListener('storage', handleThemeChange);
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
    // If no workspace is selected, or the selected one is no longer available, select the first one.
    if ((!selectedWorkspace || !userWorkspaces.some(ws => ws.id === selectedWorkspace.id)) && userWorkspaces.length > 0) {
      handleSelectWorkspace(userWorkspaces[0]);
    } else if (userWorkspaces.length === 0) {
      setSelectedWorkspace(null);
    }
  }, [currentUser, selectedWorkspace]);

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
              await refreshWorkspaces();
              setNotification({
                  message: `You've been added to a new workspace!`,
                  workspaceName: newWorkspace.name,
              });
          }
          refreshInvitations();
      }, 30000);
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
        await handleSelectWorkspace(newWorkspace);
    } catch (error) {
        console.error("Failed to create workspace:", error);
        throw error;
    }
  };

  const handleSelectWorkspace = async (workspace: Workspace) => {
    if(selectedWorkspace?.id === workspace.id && screen !== Screen.Analysis) return;
    setSelectedWorkspace(workspace);
    setActiveReport(null); // Clear active report when switching workspace
    await loadWorkspaceData(workspace.id);
    navigateTo(Screen.Dashboard); // Always go to Dashboard on workspace select
  };

  const handleAnalysisComplete = async (report: AnalysisReport) => {
    if (!selectedWorkspace) return;
    const newReport = { ...report, workspaceId: selectedWorkspace.id };
    const addedReport = await workspaceApi.addReport(newReport);
    await addAuditLog('Analysis Run', JSON.stringify({ message: `Analysis completed for: ${report.title}`, reportId: addedReport.id }));
    await loadWorkspaceData(selectedWorkspace.id);
    setActiveReport(addedReport);
    return addedReport;
  };

  const handleFileUpload = async (content: string, fileName: string) => {
    if (!selectedWorkspace) return;
    addAuditLog('Document Upload', `File uploaded: ${fileName}`);
    setIsAnalyzing(true);
    const reportData = await vestaApi.analyzePlan(content, knowledgeBaseSources, dismissalRules, customRegulations);
    const report = { ...reportData, title: fileName || "Pasted Text Analysis" };
    await handleAnalysisComplete(report as AnalysisReport);
    setIsAnalyzing(false);
    setUploadModalOpen(false);
    navigateTo(Screen.Analysis);
  };
  
  const handleSelectReport = (report: AnalysisReport) => {
    setActiveReport(report);
    navigateTo(Screen.Analysis);
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

  const handleAutoEnhance = async (report: AnalysisReport) => {
      if (!report) return;
      setIsAnalyzing(true);
      const improvedContent = await vestaApi.improvePlan(report.documentContent, report);
      const updatedReportData = { ...report, documentContent: improvedContent };
      // Re-run analysis on the improved content
      const newAnalysisData = await vestaApi.analyzePlan(improvedContent, knowledgeBaseSources, dismissalRules, customRegulations);
      const enhancedReport = {
          ...updatedReportData,
          ...newAnalysisData,
          title: report.title, // Keep original title
      };
      
      const finalReport = await handleAnalysisComplete(enhancedReport as AnalysisReport);
      addAuditLog('Auto-Fix', `Auto-Enhanced document: ${report.title}`);
      setIsAnalyzing(false);
      return finalReport;
  };

  const addKnowledgeSource = async (title: string, content: string, category: KnowledgeCategory) => {
    if (!selectedWorkspace) return;
    await workspaceApi.addKnowledgeSource(selectedWorkspace.id, { title, content, category, isEditable: true });
    await loadWorkspaceData(selectedWorkspace.id);
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

  const handleUpdateWorkspaceName = async (workspaceId: string, name: string) => {
    try {
        await workspaceApi.updateWorkspaceName(workspaceId, name);
        setSelectedWorkspace(prev => prev ? { ...prev, name } : null);
        setWorkspaces(prev => prev.map(ws => ws.id === workspaceId ? { ...ws, name } : ws));
        await loadWorkspaceData(workspaceId);
    } catch (error) {
        console.error("Failed to update workspace name:", error);
        alert((error as Error).message);
        refreshWorkspaces();
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
    if (!selectedWorkspace) {
        return <NoWorkspaceSelectedScreen onCreate={() => setCreateWorkspaceModalOpen(true)} />;
    }
    const layoutProps = {
        navigateTo,
        currentUser: currentUser!,
        onLogout: handleLogout,
        currentWorkspace: selectedWorkspace,
        onManageMembers: () => setManageMembersModalOpen(true),
        userRole,
    };

    switch (screen) {
      case Screen.Dashboard:
        return <UploadScreen reports={reports} onSelectReport={handleSelectReport} onNewAnalysisClick={() => setUploadModalOpen(true)} />;
      case Screen.Analysis:
        return <AnalysisScreen {...layoutProps} activeReport={activeReport} onUpdateReport={handleUpdateReport} onAutoEnhance={handleAutoEnhance} isEnhancing={isAnalyzing} />;
      case Screen.AuditTrail:
        return <AuditTrailScreen {...layoutProps} logs={auditLogs} reports={reports} onSelectReport={handleSelectReport} />;
      case Screen.Settings:
        return <SettingsScreen {...layoutProps} dismissalRules={dismissalRules} onDeleteDismissalRule={deleteDismissalRule} onUserUpdate={handleUserUpdate} customRegulations={customRegulations} onAddRegulation={handleAddRegulation} onDeleteRegulation={handleDeleteRegulation} />;
      default:
        return <UploadScreen reports={reports} onSelectReport={handleSelectReport} onNewAnalysisClick={() => setUploadModalOpen(true)} />;
    }
  };

  if (loading) return <InitializingScreen />;
  if (!currentUser) return <LoginScreen />;

  return (
    <div className="font-sans bg-gray-50 dark:bg-neutral-950 min-h-screen text-gray-800 dark:text-neutral-200">
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
        {selectedWorkspace && isManageMembersModalOpen && (
            <ManageMembersModal 
                onClose={() => setManageMembersModalOpen(false)}
                currentMembers={workspaceMembers}
                currentUserEmail={currentUser.email}
                onInviteUser={handleInviteUser}
                onRemoveUser={handleRemoveUser}
                onUpdateRole={handleUpdateRole}
            />
        )}
        {isKnowledgeBaseModalOpen && selectedWorkspace && (
             <KnowledgeBaseModal
                onClose={() => setKnowledgeBaseModalOpen(false)}
                sources={knowledgeBaseSources}
                onAddSource={addKnowledgeSource}
                onDeleteSource={deleteKnowledgeSource}
                isSyncing={isSyncingSources}
                userRole={userRole}
            />
        )}
        {isUploadModalOpen && (
            <UploadModal
                onClose={() => setUploadModalOpen(false)}
                onUpload={handleFileUpload}
                isAnalyzing={isAnalyzing}
            />
        )}
        <Layout
            navigateTo={navigateTo}
            currentUser={currentUser}
            onLogout={handleLogout}
            currentWorkspace={selectedWorkspace}
            workspaces={workspaces}
            onSelectWorkspace={handleSelectWorkspace}
            onManageMembers={() => setManageMembersModalOpen(true)}
            userRole={userRole}
            onCreateWorkspace={() => setCreateWorkspaceModalOpen(true)}
            onUpdateWorkspaceName={handleUpdateWorkspaceName}
            onKnowledgeBase={() => setKnowledgeBaseModalOpen(true)}
            onNewAnalysis={() => setUploadModalOpen(true)}
        >
            {renderScreenComponent()}
        </Layout>
    </div>
  );
}

export default App;