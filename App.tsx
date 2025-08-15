import React, { useState, useEffect, useCallback } from 'react';
import { Screen, NavigateTo, AnalysisReport, User, AuditLog, AuditLogAction, KnowledgeSource, DismissalRule, FeedbackReason, Finding, KnowledgeCategory, Workspace, WorkspaceMember, UserRole } from './types';
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

const App: React.FC = () => {
  const { currentUser, loading, logout } = useAuth();
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
  
  const [activeReport, setActiveReport] = useState<AnalysisReport | null>(null);
  
  // Modal State
  const [isCreateWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);
  const [isManageMembersModalOpen, setManageMembersModalOpen] = useState(false);

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
    
    const members = await workspaceApi.getWorkspaceMembers(workspaceId);
    setWorkspaceMembers(members);
    const member = members.find(m => m.userId === currentUser.id);
    setUserRole(member?.role || 'Member');

  }, [currentUser]);

  const refreshWorkspaces = useCallback(async () => {
    if (!currentUser) return;
    const userWorkspaces = await workspaceApi.getWorkspacesForUser(currentUser.id);
    setWorkspaces(userWorkspaces);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshWorkspaces();
      setSelectedWorkspace(null);
      setScreen(Screen.WorkspaceDashboard);
    } else if (!loading) {
      setScreen(Screen.Login);
      setSelectedWorkspace(null);
      setWorkspaces([]);
      setReports([]);
      setAuditLogs([]);
      setKnowledgeBaseSources([]);
      setDismissalRules([]);
      setActiveReport(null);
    }
  }, [currentUser, loading, refreshWorkspaces]);
  
  const addAuditLog = useCallback(async (action: AuditLogAction, details: string) => {
    if(!currentUser || !selectedWorkspace) return;
    await workspaceApi.addAuditLog(selectedWorkspace.id, currentUser, action, details);
    loadWorkspaceData(selectedWorkspace.id);
  }, [currentUser, selectedWorkspace, loadWorkspaceData]);
  
  const handleLogout = () => {
    logout();
  };

  const handleCreateWorkspace = async (name: string) => {
    if (!currentUser) return;
    const newWorkspace = await workspaceApi.createWorkspace(name, currentUser);
    await workspaceApi.addAuditLog(newWorkspace.id, currentUser, 'Workspace Created', `Workspace "${name}" created.`);
    await refreshWorkspaces();
    setCreateWorkspaceModalOpen(false);
  };

  const handleSelectWorkspace = async (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    await loadWorkspaceData(workspace.id);
    navigateTo(Screen.Dashboard);
  };
  
  const handleBackToWorkspaces = () => {
    setSelectedWorkspace(null);
    setActiveReport(null);
    navigateTo(Screen.WorkspaceDashboard);
  }

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
    const fullReport = (await workspaceApi.getWorkspaceData(selectedWorkspace.id)).reports[0];
    setActiveReport(fullReport);
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
  
  const addAutomatedKnowledgeSource = async (source: Omit<KnowledgeSource, 'id' | 'workspaceId'>) => {
      if (!selectedWorkspace) return;
      await workspaceApi.addKnowledgeSource(selectedWorkspace.id, source);
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

  const handleRemoveUser = async (userId: string) => {
      if (!selectedWorkspace || !currentUser) return;
      const member = workspaceMembers.find(m => m.userId === userId);
      if(!member) return;
      await workspaceApi.removeUser(selectedWorkspace.id, userId);
      await addAuditLog('User Removed', `Removed user ${member.email}.`);
      await loadWorkspaceData(selectedWorkspace.id);
  };

  const handleUpdateRole = async (userId: string, role: UserRole) => {
      if (!selectedWorkspace || !currentUser) return;
      const member = workspaceMembers.find(m => m.userId === userId);
      if(!member) return;
      await workspaceApi.updateUserRole(selectedWorkspace.id, userId, role);
      await addAuditLog('Role Changed', `Changed role for ${member.email} to ${role}.`);
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
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light-main dark:bg-dark-main">
                <p className="text-secondary-text-light dark:text-secondary-text-dark">Initializing Session...</p>
            </div>
        );
    }
    
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
        screenComponent = <AnalysisScreen {...layoutProps} activeReport={activeReport} onAnalysisComplete={handleAnalysisComplete} addAuditLog={addAuditLog} knowledgeBaseSources={knowledgeBaseSources} dismissalRules={dismissalRules} onAddDismissalRule={addDismissalRule} />;
        break;
      case Screen.AuditTrail:
        screenComponent = <AuditTrailScreen {...layoutProps} logs={auditLogs} />;
        break;
      case Screen.KnowledgeBase:
        screenComponent = <KnowledgeBaseScreen {...layoutProps} sources={knowledgeBaseSources} onAddSource={addKnowledgeSource} onDeleteSource={deleteKnowledgeSource} onAddAutomatedSource={addAutomatedKnowledgeSource} />;
        break;
      case Screen.Settings:
        screenComponent = <SettingsScreen {...layoutProps} dismissalRules={dismissalRules} onDeleteDismissalRule={deleteDismissalRule} />;
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
                    currentUserId={currentUser.id}
                    onInviteUser={handleInviteUser}
                    onRemoveUser={handleRemoveUser}
                    onUpdateRole={handleUpdateRole}
                />
            )}
        </>
    );
  };

  return (
    <div className="font-sans bg-light-main dark:bg-dark-main min-h-screen text-primary-text-light dark:text-primary-text-dark">
      {renderScreen()}
    </div>
  );
}

export default App;