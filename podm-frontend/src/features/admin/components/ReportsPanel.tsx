import React from 'react';
import { Download, Play } from 'lucide-react';

// --- Local Types ---
interface Report {
    id: number;
    name: string;
    lastRun: string;
}

// --- Main Reports Panel Component ---
interface ReportsPanelProps {
    reports: Report[];
}

const ReportsPanel = ({ reports }: ReportsPanelProps) => (
    <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">Report Builder</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Report Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g., Monthly Creator Payouts" 
                            className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Metrics</label>
                        <select className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option>Users</option>
                            <option>Revenue</option>
                            <option>Engagement</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Filters</label>
                        <select className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option>No Filter</option>
                            <option>User Type</option>
                            <option>User Status</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium mb-1">Date Range</label>
                        <div className="flex items-center space-x-2">
                            <input type="date" className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            <span>to</span>
                            <input type="date" className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                    </div>
                    <div className="pt-6 flex items-center space-x-3">
                        <button className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                            <Play className="w-4 h-4" />
                            <span>Generate</span>
                        </button>
                        <button className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">Saved Reports</h3>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map(report => (
                    <li key={report.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div>
                            <p className="font-medium">{report.name}</p>
                            <p className="text-xs text-gray-500">Last run: {report.lastRun}</p>
                        </div>
                        <button className="text-sm font-medium text-purple-600 hover:underline">Run Again</button>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

export default ReportsPanel;
