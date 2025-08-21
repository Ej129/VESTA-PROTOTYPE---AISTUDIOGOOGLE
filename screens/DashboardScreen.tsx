

import React, { useState, useRef, useEffect } from 'react';
import { Screen, AnalysisReport, ScreenLayoutProps, UserRole } from '../types';
import { SidebarMainLayout } from '../components/Layout';
import { PlusIcon, BriefcaseIcon, ShieldIcon, AlertTriangleIcon, MoreVerticalIcon } from '../components/Icons';


interface DashboardScreenProps extends ScreenLayoutProps {
  reports: AnalysisReport[];
  onSelectReport: (report: AnalysisReport) => void;
  onStartNewAnalysis: () => void;
  onUpdateReportStatus: (reportId: string, status: 'active' | 'archived') => void;
  onDeleteReport: (reportId: string) => void;
}

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const getColor = () => {
    if (value < 50) return 'bg-accent-critical';
    if (value < 80) return 'bg-accent-warning';
    return 'bg-accent-success';
  }
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div className={`${getColor()} h-2 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
  );
};

interface AnalysisCardProps {
  report: AnalysisReport;
  action: () => void;
  userRole: UserRole;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ report, action, userRole, onArchive, onUnarchive, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const isArchived = report.status === 'archived';

    return (
        <div 
            className="bg-vesta-card-light dark:bg-vesta-card-dark p-5 rounded-xl shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between border border-vesta-border-light dark:border-vesta-border-dark relative"
        >
            {userRole === 'Administrator' && (
                <div ref={menuRef} className="absolute top-3 right-3 z-10">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }} 
                        className="p-2 rounded-full text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark hover:bg-gray-200 dark:hover:bg-vesta-bg-dark"
                        aria-label="More options"
                    >
                        <MoreVerticalIcon className="w-5 h-5" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-vesta-card-light dark:bg-vesta-card-dark rounded-md shadow-lg z-50 border border-vesta-border-light dark:border-vesta-border-dark py-1">
                            {isArchived ? (
                                <button onClick={(e) => { e.stopPropagation(); onUnarchive(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-vesta-text-light dark:text-vesta-text-dark hover:bg-gray-100 dark:hover:bg-black">Unarchive</button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); onArchive(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-vesta-text-light dark:text-vesta-text-dark hover:bg-gray-100 dark:hover:bg-black">Archive</button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-black">Delete</button>
                        </div>
                    )}
                </div>
            )}
            <div onClick={action} className="cursor-pointer">
                <h3 className="font-bold text-lg text-vesta-gold dark:text-vesta-gold truncate pr-8">{report.title}</h3>
                <div className="flex items-center space-x-2 mt-3 mb-1">
                    <span className="font-display font-bold text-vesta-red dark:text-vesta-red">{report.resilienceScore}%</span>
                    <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">Resilience</p>
                </div>
                <ProgressBar value={report.resilienceScore} />
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
                {report.summary.critical > 0 ? (
                     <div className="flex items-center text-accent-critical">
                        <AlertTriangleIcon className="w-4 h-4 mr-1.5" />
                        <span className="font-semibold">{report.summary.critical} Critical</span>
                    </div>
                ) : (
                    <div className="flex items-center text-accent-warning">
                        <AlertTriangleIcon className="w-4 h-4 mr-1.5" />
                        <span className="font-semibold">{report.summary.warning} Warning(s)</span>
                    </div>
                )}
                 <p>{new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void; }> = ({ title, message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in" aria-modal="true" role="dialog">
            <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-2xl p-8 max-w-md w-full transform transition-all animate-fade-in-up">
                <h2 className="text-xl font-bold text-vesta-red mb-4">{title}</h2>
                <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark mb-8">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="px-6 py-2 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-vesta-card-dark transition-all text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark border border-transparent">Cancel</button>
                    <button onClick={onConfirm} className="bg-vesta-red text-white font-bold py-2 px-6 rounded-lg hover:bg-vesta-red-dark transition-all">Confirm Delete</button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};


const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-vesta-card-light dark:bg-vesta-card-dark p-5 rounded-xl shadow-md border border-vesta-border-light dark:border-vesta-border-dark flex items-center space-x-4">
      <div className="bg-vesta-red/10 dark:bg-vesta-red/20 p-3 rounded-lg">
          {icon}
      </div>
      <div>
          <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">{title}</p>
          <p className="text-2xl font-bold font-display text-vesta-text-light dark:text-vesta-text-dark">{value}</p>
      </div>
  </div>
);

const AtAGlance: React.FC<{reports: AnalysisReport[]}> = ({ reports }) => {
    const totalAnalyses = reports.length;
    const averageResilience = totalAnalyses > 0 
        ? Math.round(reports.reduce((acc, r) => acc + r.resilienceScore, 0) / totalAnalyses)
        : 0;

    const topWarning = () => {
        if (totalAnalyses === 0) return 'No issues yet';
        const allFindings = reports.flatMap(r => r.findings);
        const criticals = allFindings.filter(f => f.severity === 'critical');
        if (criticals.length > 0) return `${criticals.length} Critical Issue(s)`;
        const warnings = allFindings.filter(f => f.severity === 'warning');
        if (warnings.length > 0) return `${warnings.length} Total Warning(s)`;
        return 'All Clear';
    }

    return (
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark p-6 rounded-xl shadow-md border border-vesta-border-light dark:border-vesta-border-dark">
            <h3 className="text-xl font-bold text-vesta-gold dark:text-vesta-gold mb-4">At a Glance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Analyses" value={totalAnalyses} icon={<BriefcaseIcon className="w-6 h-6 text-vesta-red"/>} />
                <StatCard title="Average Resilience" value={`${averageResilience}%`} icon={<ShieldIcon className="w-6 h-6 text-vesta-red"/>} />
                <StatCard title="Top Concern" value={topWarning()} icon={<AlertTriangleIcon className="w-6 h-6 text-vesta-red"/>} />
            </div>
        </div>
    );
}

const DashboardScreen: React.FC<DashboardScreenProps> = (props) => {
  const { 
    reports, 
    onSelectReport, 
    onStartNewAnalysis, 
    currentUser,
    userRole,
    onUpdateReportStatus,
    onDeleteReport,
  } = props;
  
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [reportToDelete, setReportToDelete] = useState<AnalysisReport | null>(null);

  const activeReports = reports.filter(r => r.status !== 'archived');
  const archivedReports = reports.filter(r => r.status === 'archived');
  const reportsToShow = view === 'active' ? activeReports : archivedReports;

  const handleDeleteClick = (report: AnalysisReport) => {
    setReportToDelete(report);
  };
  
  const confirmDelete = () => {
    if (reportToDelete) {
      onDeleteReport(reportToDelete.id);
      setReportToDelete(null);
    }
  };
  
  return (
    <SidebarMainLayout {...props} activeScreen={Screen.Dashboard}>
      <div className="p-8">
          <div className="space-y-8">
              <div className="flex justify-between items-center">
                  <div>
                      <h1 className="text-3xl font-bold text-vesta-red dark:text-vesta-gold">Dashboard</h1>
                      <p className="text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">Welcome back, {currentUser.name}!</p>
                  </div>
                  <button 
                    id="new-analysis-button"
                    onClick={onStartNewAnalysis}
                    className="relative bg-vesta-red text-white font-bold py-2 px-5 rounded-lg transition-all duration-200 inline-flex items-center shadow-sm hover:shadow-md hover:bg-vesta-red-dark"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    New Analysis
                  </button>
              </div>

              <AtAGlance reports={activeReports} />
            
              <div>
                  <div className="flex justify-between items-center mt-6 mb-4">
                    <h2 className="text-2xl font-bold text-vesta-gold dark:text-vesta-gold">Analyses</h2>
                    <div className="flex items-center border border-vesta-border-light dark:border-vesta-border-dark rounded-lg p-1 bg-vesta-card-light dark:bg-vesta-card-dark">
                        <button onClick={() => setView('active')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === 'active' ? 'bg-vesta-red text-white' : 'text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark'}`}>Active ({activeReports.length})</button>
                        <button onClick={() => setView('archived')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${view === 'archived' ? 'bg-vesta-red text-white' : 'text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark'}`}>Archived ({archivedReports.length})</button>
                    </div>
                  </div>

                  {reportsToShow.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reportsToShow.map(report => (
                        <AnalysisCard 
                            key={report.id} 
                            report={report}
                            action={() => onSelectReport(report)}
                            userRole={userRole}
                            onArchive={() => onUpdateReportStatus(report.id, 'archived')}
                            onUnarchive={() => onUpdateReportStatus(report.id, 'active')}
                            onDelete={() => handleDeleteClick(report)}
                        />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center bg-vesta-card-light dark:bg-vesta-card-dark p-12 rounded-xl border border-vesta-border-light dark:border-vesta-border-dark">
                        <h2 className="text-2xl font-bold text-vesta-gold dark:text-vesta-gold">No {view} analyses</h2>
                        <p className="mt-2 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
                            {view === 'active' 
                                ? 'Click the "New Analysis" button to get started.' 
                                : 'You haven\'t archived any analyses yet.'
                            }
                        </p>
                    </div>
                  )}
              </div>
          </div>
      </div>
       {reportToDelete && (
        <ConfirmationModal 
          title="Confirm Deletion"
          message={`Are you sure you want to permanently delete "${reportToDelete.title}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setReportToDelete(null)}
        />
      )}
    </SidebarMainLayout>
  );
};

export default DashboardScreen;