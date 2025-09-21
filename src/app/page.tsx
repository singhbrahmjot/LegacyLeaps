'use client';
import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    original?: string;
    jsonData?: unknown[];
    dbSchema?: string;
    apiCode?: string;
    microservices?: string;
    fullAppFiles?: Record<string, string>;
    agentSteps?: Array<{ agent: string; output: string; status: string }>;
    queriedData?: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');

  const pieChartRef = useRef<HTMLCanvasElement | null>(null);
  const barChartRef = useRef<HTMLCanvasElement | null>(null);
  const pieChartInstance = useRef<Chart | null>(null);
  const barChartInstance = useRef<Chart | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/modernize', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result?.apiCode || !query) return;
    try {
      const res = await fetch(`/api/customers?${query}`);
      const data = await res.json();
      setResult((prev) => prev ? { ...prev, queriedData: data } : null);
    } catch {
      setError('Query failed. Check the query format (e.g., id=10001).');
    }
  };

  const handleDownload = () => {
    if (!result?.fullAppFiles) return;
    const zip = new JSZip();
    Object.entries(result.fullAppFiles as Record<string, string>).forEach(([filename, content]) => {
      zip.file(filename, content);
    });
    zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
      saveAs(content, 'modernized-microservice.zip');
    });
  };

  const getChartData = (): { doughnut: unknown; bar: unknown } | null => {
    if (!result?.jsonData || !Array.isArray(result.jsonData)) return null;

    const emailDomains = result.jsonData.reduce((acc: Record<string, number>, item: unknown) => {
      const email = (item as { Email?: string }).Email || '';
      const domain = email.includes('@') ? email.split('@')[1] || 'Unknown' : 'Unknown';
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {});

    const nameLengthCategories = result.jsonData.reduce((acc: Record<string, number>, item: unknown) => {
      const name = (item as { CustomerName?: string }).CustomerName || '';
      const length = name.length;
      const category = length < 10 ? 'Short Name' : length < 15 ? 'Medium Name' : 'Long Name';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return {
      doughnut: {
        labels: Object.keys(emailDomains),
        datasets: [{
          label: 'Customers by Email Domain',
          data: Object.values(emailDomains),
          backgroundColor: ['#6366F1', '#10B981', '#F59E0B', '#EF4444'],
          borderColor: ['#4F46E5', '#059669', '#D97706', '#DC2626'],
          borderWidth: 1,
        }],
      },
      bar: {
        labels: Object.keys(nameLengthCategories),
        datasets: [{
          label: 'Customers by Name Length Category',
          data: Object.values(nameLengthCategories),
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
          borderColor: ['#059669', '#D97706', '#DC2626'],
          borderWidth: 1,
        }],
      },
    };
  };

  const chartData = getChartData();

  useEffect(() => {
  if (!chartData || !pieChartRef.current || !barChartRef.current) return;

  if (pieChartInstance.current) pieChartInstance.current.destroy();
  if (barChartInstance.current) barChartInstance.current.destroy();

  pieChartInstance.current = new Chart(pieChartRef.current, {
    type: 'doughnut',
    data: chartData.doughnut,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 14, family: 'Roboto' } } },
        title: { display: true, text: 'Customers by Email Domain', font: { size: 18, family: 'Roboto', weight: 600 } }, // Changed '600' to 600
        tooltip: { enabled: true, bodyFont: { family: 'Roboto' } },
      },
      animation: { duration: 1500, easing: 'easeInOutQuad' },
    },
  });

  barChartInstance.current = new Chart(barChartRef.current, {
    type: 'bar',
    data: chartData.bar,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 14, family: 'Roboto' } } },
        title: { display: true, text: 'Customers by Name Length Category', font: { size: 18, family: 'Roboto', weight: 600 } }, // Changed '600' to 600
        tooltip: { enabled: true, bodyFont: { family: 'Roboto' } },
      },
      animation: { duration: 1500, easing: 'easeInOutQuad' },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Count', font: { family: 'Roboto' } } },
        x: { title: { display: true, text: 'Category', font: { family: 'Roboto' } } },
      },
    },
  });

  return () => {
    if (pieChartInstance.current) pieChartInstance.current.destroy();
    if (barChartInstance.current) barChartInstance.current.destroy();
  };
}, [chartData]);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-2xl font-semibold text-gray-900 text-center">LegacyLeap AS/400 Modernization Assistant</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-8 py-12">
        {/* Upload Section */}
        <section className="bg-white border border-gray-200 rounded-lg p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Upload Your AS/400 File</h2>
            <p className="text-gray-600">Select a file to modernize and analyze your legacy data</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="flex flex-col space-y-4">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
              >
                {loading ? 'Processing...' : 'Modernize Now'}
              </button>
            </div>
            {error && <p className="text-red-600 mt-4 text-sm text-center">{error}</p>}
          </div>
        </section>

        {result && (
          <>
            {/* Processing Timeline */}
            {result.agentSteps && (
              <section className="bg-white border border-gray-200 rounded-lg p-8 mb-12">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-medium text-gray-900 mb-2">Processing Timeline</h2>
                  <p className="text-gray-600">Overview of the multi-agent modernization process</p>
                </div>
                <div className="max-w-4xl mx-auto">
                  <div className="space-y-4">
                    {result.agentSteps.map((step, index: number) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-md">
                        <div className={`w-3 h-3 rounded-full ${step.status === 'complete' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="font-medium text-gray-800">{step.agent}:</span>
                        <span className="text-gray-600">{step.output}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Data Visualizations */}
            {chartData && (
              <section className="bg-white border border-gray-200 rounded-lg p-8 mb-12">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-medium text-gray-900 mb-2">Data Visualizations</h2>
                  <p className="text-gray-600">Insights from your modernized data</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gray-50 p-6 rounded-md">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 text-center">Customers by Email Domain</h3>
                    <div className="h-64">
                      <canvas ref={pieChartRef} />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-md">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 text-center">Customers by Name Length Category</h3>
                    <div className="h-64">
                      <canvas ref={barChartRef} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Original Data */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 text-center">Original Data Sample</h2>
                <p className="text-gray-600 mb-4 text-center text-sm">Preview of uploaded legacy data</p>
                <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-x-auto font-mono max-h-64">{result.original}</pre>
              </div>

              {/* Transformed JSON */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 text-center">Transformed JSON</h2>
                <p className="text-gray-600 mb-4 text-center text-sm">Modernized data in JSON format</p>
                <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-x-auto font-mono max-h-64">{JSON.stringify(result.jsonData, null, 2)}</pre>
              </div>

              {/* Database Schema */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 text-center">Database Schema</h2>
                <p className="text-gray-600 mb-4 text-center text-sm">PostgreSQL schema for transformed data</p>
                <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-x-auto font-mono max-h-64">{result.dbSchema}</pre>
              </div>

              {/* REST API */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 text-center">Generated REST API</h2>
                <p className="text-gray-600 mb-4 text-center text-sm">Next.js API endpoint code</p>
                <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-x-auto font-mono max-h-64">{result.apiCode}</pre>
                <form onSubmit={handleQuery} className="mt-4 flex space-x-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Query e.g., id=10001"
                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Run Query
                  </button>
                </form>
                {result.queriedData && (
                  <pre className="bg-gray-50 p-4 rounded-md mt-4 text-xs overflow-x-auto font-mono max-h-32">
                    {JSON.stringify(result.queriedData, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {/* Microservices and Download */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Microservices */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 text-center">Microservices Suggestions</h2>
                <p className="text-gray-600 mb-4 text-center text-sm">Architecture recommendations</p>
                <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-x-auto font-mono max-h-64">{result.microservices}</pre>
              </div>

              {/* Download */}
              {result.fullAppFiles && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4 text-center">Download Application</h2>
                  <p className="text-gray-600 mb-4 text-center text-sm">Get the full modernized microservice</p>
                  <div className="text-center">
                    <button
                      onClick={handleDownload}
                      className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
                    >
                      Download ZIP
                    </button>
                    <p className="text-xs text-gray-500 mt-3">Includes app.js, package.json, and data.js</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 text-center py-6">
        <p className="text-sm text-gray-600">&copy; 2025 LegacyLeap. All rights reserved.</p>
      </footer>
    </div>
  );
}