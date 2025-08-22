

import React from 'react';
import { AnalysisReport } from '../types';
import { PlusIcon, CheckCircleIcon, BriefcaseIcon, AlertTriangleIcon } from '../components/Icons';

interface DashboardScreenProps {
  reports: AnalysisReport[];
  onSelectReport: (report: AnalysisReport) => void;
  onNewAnalysisClick: () => void;
}

const KPITile: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-vesta-card-light dark:bg-vesta-card-dark p-6 rounded-xl shadow-sm border border-vesta-border-light dark:border-vesta-border-dark flex items-center space-x-4">
        <div className="bg-vesta-red/10 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">{title}</p>
            <p className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark">{value}</p>
        </div>
    </div>
);

const UploadScreen: React.FC<DashboardScreenProps> = ({ reports, onSelectReport, onNewAnalysisClick }) => {
    
    const analysesCompleted = reports.length;
    const pendingReviews = reports.filter(r => r.findings.some(f => f.status === 'active')).length;
    const avgScore = reports.length > 0 ? Math.round(reports.reduce((acc, r) => acc + (r.scores?.project || r.resilienceScore), 0) / reports.length) : 0;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-vesta-text-light dark:text-vesta-text-dark">Dashboard</h1>
                <button 
                    onClick={onNewAnalysisClick}
                    className="flex items-center bg-vesta-red text-white font-bold py-2 px-5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:bg-vesta-red-dark"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    New Analysis
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPITile title="Analyses Completed" value={analysesCompleted} icon={<CheckCircleIcon className="w-6 h-6 text-vesta-red" />} />
                <KPITile title="Pending Reviews" value={pendingReviews} icon={<AlertTriangleIcon className="w-6 h-6 text-vesta-red" />} />
                <KPITile title="Avg. Compliance Score" value={`${avgScore}%`} icon={<BriefcaseIcon className="w-6 h-6 text-vesta-red" />} />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-vesta-text-light dark:text-vesta-text-dark mb-4">Recent Analyses</h2>
                <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-xl shadow-sm border border-vesta-border-light dark:border-vesta-border-dark">
                    <div className="overflow-x-auto">
                        {reports.length > 0 ? (
                             <table className="w-full text-left">
                                <thead className="border-b border-vesta-border-light dark:border-vesta-border-dark">
                                    <tr>
                                        <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Document Title</th>
                                        <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Date</th>
                                        <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Score</th>
                                        <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.slice(0, 5).map(report => {
                                        const hasActiveFindings = report.findings.some(f => f.status === 'active');
                                        return (
                                            <tr key={report.id} onClick={() => onSelectReport(report)} className="border-b border-vesta-border-light dark:border-vesta-border-dark last:border-b-0 hover:bg-gray-50 dark:hover:bg-vesta-bg-dark/20 transition-colors cursor-pointer">
                                                <td className="p-4 font-semibold text-vesta-text-light dark:text-vesta-text-dark">{report.title}</td>
                                                <td className="p-4 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">{new Date(report.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 font-bold text-vesta-red">{report.scores?.project || report.resilienceScore}%</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${hasActiveFindings ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                                        {hasActiveFindings ? 'Review Needed' : 'Completed'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center">
                                <BriefcaseIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                                <h3 className="text-lg font-semibold text-vesta-text-light dark:text-vesta-text-dark mt-4">No Analyses Yet</h3>
                                <p className="mt-1 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">Click "New Analysis" to get started.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadScreen;