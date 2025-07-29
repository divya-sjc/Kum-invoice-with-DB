import { useState, useEffect } from "react";

type InvoiceCountsType = {
  total: number;
  pending: number;
  paid: number;
};

export const InvoiceStatusTab = () => {
  const [counts, setCounts] = useState<InvoiceCountsType>({ total: 0, pending: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setError(null);
        const response = await fetch("http://localhost:4000/api/invoice-counts");
        if (!response.ok) {
          throw new Error('Failed to fetch invoice counts');
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server did not return JSON");
        }
        const data = await response.json();
        if (typeof data.total !== 'number' || typeof data.pending !== 'number' || typeof data.paid !== 'number') {
          throw new Error('Invalid data format received from server');
        }
        setCounts(data);
      } catch (err) {
        console.error('Error fetching invoice counts:', err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    // Set up interval to refresh counts every 30 seconds
    const intervalId = setInterval(fetchCounts, 30000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <div className="animate-pulse bg-gray-200 rounded h-12 w-56"></div>;
  
  if (error) return (
    <div className="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm">
      Error loading invoice counts: {error}
    </div>
  );

  return (
    <div className="bg-white border rounded-lg shadow-md p-3 flex space-x-4 transition-all hover:shadow-lg">
      <div className="text-center">
        <div className="text-sm font-medium text-gray-500">Total Invoices</div>
        <div className="text-2xl font-bold text-blue-600">{counts.total}</div>
      </div>
      <div className="border-l pl-4 flex flex-col">
        <div className="text-sm font-medium text-gray-500">Pending</div>
        <div className="flex items-center">
          <div className="text-2xl font-bold text-red-600">{counts.pending}</div>
          <div className="ml-2 text-xs font-medium">
            {counts.total > 0 ? 
              <span className={`px-2 py-1 rounded-full ${counts.pending > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {Math.round((counts.pending / counts.total) * 100)}%
              </span> : 
              <span>0%</span>
            }
          </div>
        </div>
      </div>
      <div className="border-l pl-4 flex flex-col">
        <div className="text-sm font-medium text-gray-500">Paid</div>
        <div className="flex items-center">
          <div className="text-2xl font-bold text-green-600">{counts.paid}</div>
          <div className="ml-2 text-xs font-medium">
            {counts.total > 0 ? 
              <span className={`px-2 py-1 rounded-full bg-green-100 text-green-800`}>
                {Math.round((counts.paid / counts.total) * 100)}%
              </span> : 
              <span>0%</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceStatusTab;
