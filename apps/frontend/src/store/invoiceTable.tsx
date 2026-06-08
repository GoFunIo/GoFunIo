import React from 'react';
import { Column } from '@/types/table';
import { Download } from 'lucide-react';

export interface InvoiceTable {
  id: string;
  date: string;
  number: string;
  plan: string;
  amount: string;
  status: 'opłacona' | 'nieopłacona';
}

export const invoiceColumns: Column<InvoiceTable>[] = [
  {
    header: 'Data',
    accessor: 'date',
  },
  {
    header: 'Numer',
    accessor: 'number',
  },
  {
    header: 'Plan',
    accessor: 'plan',
  },
  {
    header: 'Kwota',
    accessor: 'amount',
    isImportant: true,
  },
  {
    header: 'Status',
    accessor: 'status',

    render: (value: unknown) => {
      const statusText = typeof value === 'string' ? value : String(value);
      return (
        <span className="inline-block bg-success-bg text-success text-[12px] font-semibold px-2 py-1 rounded">
          {statusText}
        </span>
      );
    },
  },
  {
    header: 'Akcje',
    accessor: 'id',

    render: (_: unknown, item: InvoiceTable) => (
      <button
        onClick={() => console.log(`Pobieranie faktury ${item.number}`)}
        className="inline-flex items-center gap-1.5 text-content-primary hover:text-info text-[13px] font-medium custom-transition ml-auto lg:ml-0"
      >
        <Download size={14} /> PDF
      </button>
    ),
  },
];

export const invoiceData: InvoiceTable[] = [
  {
    id: '1',
    date: '01.06.2026',
    number: 'FV/2026/06/01',
    plan: 'Pro — miesięczna',
    amount: '59.00 zł',
    status: 'opłacona',
  },
  {
    id: '2',
    date: '01.05.2025',
    number: 'FV/2026/05/01',
    plan: 'Pro — miesięczna',
    amount: '59.00 zł',
    status: 'opłacona',
  },
  {
    id: '3',
    date: '01.04.2026',
    number: 'FV/2026/04/01',
    plan: 'Pro — miesięczna',
    amount: '59.00 zł',
    status: 'opłacona',
  },
];
