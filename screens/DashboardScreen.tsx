import React, { useRef, useEffect, useState } from 'react';
import { NavigateTo, Screen, User, AnalysisReport, Workspace, ScreenLayoutProps } from '../types';
import { SidebarMainLayout } from '../components/Layout';
import { useTour } from '../contexts/TourContext';
import TourTooltip from '../components/TourTooltip';
import { PlusIcon, LibraryIcon, BriefcaseIcon, ShieldIcon, AlertTriangleIcon } from '../components/Icons';


interface DashboardScreenProps extends ScreenLayoutProps {
  reports: AnalysisReport[];
  onSelectReport: (report: AnalysisReport) => void;
  onStartNewAnalysis: () => void;
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
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ report, action }) => (
    <div 
        onClick={action}
        className="bg-light-card dark:bg-dark-card p-5 rounded-xl card-shadow hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between border border-border-light dark:border-border-dark"
    >
        <div>
            <h3 className="font-bold text-lg text-primary-text-light dark:text-primary-text-dark truncate">{report.title}</h3>
            <div className="flex items-center space-x-2 mt-3 mb-1">
                <span className="font-semibold text-primary-text-light dark:text-primary-text-dark">{report.resilienceScore}%</span>
                <p className="text-sm text-secondary-text-light dark:text-secondary-text-dark">Resilience</p>
            </div>
            <ProgressBar value={report.resilienceScore} />
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-secondary-text-light dark:text-secondary-text-dark">
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
             <p>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
        </div>
    </div>
);


const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-light-card dark:bg-dark-card p-5 rounded-xl card-shadow border border-border-light dark:border-border-dark flex items-center space-x-4">
      <div className="bg-primary-blue/10 dark:bg-primary-blue/20 p-3 rounded-lg">
          {icon}
      </div>
      <div>
          <p className="text-sm text-secondary-text-light dark:text-secondary-text-dark">{title}</p>
          <p className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark">{value}</p>
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
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl card-shadow border border-border-light dark:border-border-dark">
            <h3 className="text-xl font-bold text-primary-text-light dark:text-primary-text-dark mb-4">At a Glance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Analyses" value={totalAnalyses} icon={<BriefcaseIcon className="w-6 h-6 text-primary-blue"/>} />
                <StatCard title="Average Resilience" value={`${averageResilience}%`} icon={<ShieldIcon className="w-6 h-6 text-primary-blue"/>} />
                <StatCard title="Top Concern" value={topWarning()} icon={<AlertTriangleIcon className="w-6 h-6 text-primary-blue"/>} />
            </div>
        </div>
    );
}

const EmptyState: React.FC<{user: User; onStart: () => void;}> = ({ user, onStart }) => (
    <div className="text-center bg-light-card dark:bg-dark-card p-12 rounded-xl shadow-lg border border-border-light dark:border-border-dark max-w-2xl mx-auto">
        <BriefcaseIcon className="w-16 h-16 mx-auto text-primary-blue" />
        <h2 className="mt-4 text-3xl font-bold text-primary-text-light dark:text-primary-text-dark">Welcome to Vesta, {user.name.split(' ')[0]}!</h2>
        <p className="mt-3 text-lg text-secondary-text-light dark:text-secondary-text-dark">
            Create a workspace to start analyzing documents and collaborating with your team.
        </p>
        <button
            id="create-workspace-button"
            onClick={onStart}
            className="mt-8 btn-primary text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 inline-flex items-center text-lg"
        >
            <PlusIcon className="w-6 h-6 mr-2" />
            Create Your First Workspace
        </button>
    </div>
);


const DashboardScreen: React.FC<DashboardScreenProps> = ({ reports, onSelectReport, onStartNewAnalysis, ...layoutProps }) => {
  const { activeWorkspace, currentUser, onCreateWorkspace } = layoutProps;
  const tour = useTour();
  
  useEffect(() => {
    const buttonElement = document.getElementById('new-analysis-button');
    if (tour && buttonElement) {
        tour.addStep({
            selector: '#new-analysis-button',
            title: 'Start Here',
            content: 'Click here to upload a document and begin your first analysis.',
            position: 'bottom'
        });
    }
  }, [tour, reports]);

  const handleCreateWorkspace = () => {
      const name = prompt("Enter a name for your new workspace:");
      if (name) {
          onCreateWorkspace(name);
      }
  };

  if (!activeWorkspace) {
    return (
        <SidebarMainLayout {...layoutProps} activeScreen={Screen.Dashboard} >
            <div className="flex items-center justify-center h-full">
                <EmptyState user={currentUser} onStart={handleCreateWorkspace} />
            </div>
        </SidebarMainLayout>
    );
  }

  return (
    <SidebarMainLayout {...layoutProps} activeScreen={Screen.Dashboard}>
      <div className="p-8">
          <div className="space-y-8">
              <div className="flex justify-between items-center">
                  <div>
                      <h1 className="text-3xl font-bold text-primary-text-light dark:text-primary-text-dark">{activeWorkspace.name}</h1>
                      <p className="text-secondary-text-light dark:text-secondary-text-dark">Dashboard</p>
                  </div>
                  <button 
                    id="new-analysis-button"
                    onClick={onStartNewAnalysis}
                    className="relative btn-primary font-bold py-2 px-5 rounded-lg transition-all duration-200 inline-flex items-center"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    New Analysis
                  </button>
              </div>

              <AtAGlance reports={reports} />
            
              <div>
                  <h2 className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark mt-6 mb-4">Recent Analyses</h2>
                  {reports.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reports.map(report => (
                        <AnalysisCard 
                            key={report.title} 
                            report={report}
                            action={() => onSelectReport(report)}
                        />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center bg-light-card dark:bg-dark-card p-12 rounded-xl border border-border-light dark:border-border-dark">
                        <h2 className="text-2xl font-bold text-primary-text-light dark:text-primary-text-dark">Ready for your first analysis?</h2>
                        <p className="mt-2 text-secondary-text-light dark:text-secondary-text-dark">
                            Click the "New Analysis" button to get started.
                        </p>
                    </div>
                  )}
              </div>
          </div>
      </div>
       {tour && tour.isActive && tour.currentStep === 0 && document.getElementById('new-analysis-button') && (
            <TourTooltip
                targetElement={document.getElementById('new-analysis-button')!}
                step={tour.steps[tour.currentStep]}
                onNext={tour.nextStep}
                onSkip={tour.endTour}
            />
        )}
    </SidebarMainLayout>
  );
};

export default DashboardScreen;
