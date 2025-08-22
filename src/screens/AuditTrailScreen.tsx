


import React, { useState } from 'react';
import { Screen, AuditLog, ScreenLayoutProps, AnalysisReport } from '../types';
import { ExportIcon, HistoryIcon, LinkIcon } from '../components/Icons';


interface AuditTrailScreenProps extends ScreenLayoutProps {
  logs: AuditLog[];
  reports: AnalysisReport[];
  onSelectReport: (report: AnalysisReport) => void;
}

const AuditTrailScreen: React.FC<AuditTrailScreenProps> = ({ logs, reports, onSelectReport }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleExport = () => {
        alert("Exporting log...\nIn a real application, this would generate a CSV or PDF file of the audit trail.");
    };

    const handleGoToReport = (reportId: string) => {
        const report = reports.find(r => r.id === reportId);
        if (report) {
            onSelectReport(report);
        } else {
            alert("The associated report could not be found. It may have been deleted.");
        }
    };

    const filteredLogs = logs.filter(log => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const detailsText = typeof log.details === 'object' ? JSON.stringify(log.details) : log.details;
        return (
            log.userEmail.toLowerCase().includes(lowerSearchTerm) ||
            log.action.toLowerCase().includes(lowerSearchTerm) ||
            detailsText.toLowerCase().includes(lowerSearchTerm)
        );
    });

  return (
    <>
      <div className="p-8 space-y-6">
        <div className="bg-vesta-card-light dark:bg-vesta-card-dark p-4 rounded-lg shadow-md border border-vesta-border-light dark:border-vesta-border-dark flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                <input
                    type="search"
                    placeholder="Search by user, action, details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-72 px-4 py-2 border border-vesta-border-light dark:border-vesta-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-vesta-red bg-vesta-bg-light dark:bg-vesta-bg-dark text-vesta-text-light dark:text-vesta-text-dark"
                />
            </div>
            <button
                onClick={handleExport}
                className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-vesta-red text-white font-bold rounded-lg transition whitespace-nowrap hover:bg-vesta-red-dark"
            >
                <ExportIcon className="w-5 h-5 mr-2" />
                Export Log
            </button>
        </div>

        <div className="bg-vesta-card-light dark:bg-vesta-card-dark rounded-lg shadow-md overflow-hidden border border-vesta-border-light dark:border-vesta-border-dark">
          {filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-vesta-bg-dark/20 border-b border-vesta-border-light dark:border-vesta-border-dark">
                    <tr>
                      <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm w-12">Log ID</th>
                      <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Timestamp</th>
                      <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">User</th>
                      <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Action</th>
                      <th className="p-4 font-semibold text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-sm">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => {
                        let detailsContent: React.ReactNode = log.details;
                        try {
                            const parsed = JSON.parse(log.details);
                            if (typeof parsed === 'object' && parsed !== null) {
                                detailsContent = (
                                    <div className="flex items-center">
                                        <span>{parsed.message}</span>
                                        {parsed.reportId && (
                                            <button onClick={() => handleGoToReport(parsed.reportId)} className="ml-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-vesta-red" aria-label="Go to report">
                                                <LinkIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            }
                        } catch (e) {
                           // Not a JSON string, render as is
                        }

                        return (
                          <tr key={log.id} className="border-b border-vesta-border-light dark:border-vesta-border-dark last:border-b-0 hover:bg-gray-50 dark:hover:bg-vesta-bg-dark/20 transition-colors">
                            <td className="p-4 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark text-center font-mono text-xs">{logs.length - logs.indexOf(log)}</td>
                            <td className="p-4 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-4 text-vesta-text-light dark:text-vesta-text-dark font-medium">{log.userEmail}</td>
                            <td className="p-4 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">
                                <span className="px-3 py-1 text-xs font-semibold text-vesta-red bg-vesta-red/10 rounded-full">
                                  {log.action}
                                </span>
                            </td>
                            <td className="p-4 text-vesta-text-light dark:text-vesta-text-dark max-w-lg truncate">{detailsContent}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
            </div>
          ) : (
            <div className="p-12 text-center">
                <HistoryIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-semibold text-vesta-text-light dark:text-vesta-text-dark mt-4">No Activity Yet</h3>
                <p className="mt-1 text-vesta-text-secondary-light dark:text-vesta-text-secondary-dark">{searchTerm ? "No logs match your search." : "Your activity will be logged here."}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditTrailScreen;