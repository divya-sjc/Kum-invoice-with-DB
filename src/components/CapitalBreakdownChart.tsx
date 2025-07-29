import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type CapitalBreakdownProps = {
  data: {
    [key: string]: {
      inventory?: number;
      payables?: number;
      receivables?: number;
      wip?: number;
    };
  };
};

const CapitalBreakdownChart = ({ data }: CapitalBreakdownProps) => {
  const entities = Object.keys(data);
  
  const chartData = {
    labels: entities,
    datasets: [
      {
        label: 'Inventory',
        data: entities.map(entity => data[entity].inventory || 0),
        backgroundColor: '#E5E7EB',
      },
      {
        label: 'Payables',
        data: entities.map(entity => data[entity].payables || 0),
        backgroundColor: '#F87171',
      },
      {
        label: 'Receivables',
        data: entities.map(entity => data[entity].receivables || 0),
        backgroundColor: '#60A5FA',
      },
      {
        label: 'WIP',
        data: entities.map(entity => data[entity].wip || 0),
        backgroundColor: '#34D399',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#fff',
        },
      },
      y: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#fff',
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#fff',
        },
      },
      title: {
        display: false,
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CapitalBreakdownChart;
