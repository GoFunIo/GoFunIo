import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { serviceTypeLabels } from '@/features/dashboard/constants/serviceOptions';
import { ServiceData } from '@/features/dashboard/types';

async function fontToBase64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const formatCost = (value: number) =>
  value.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' zł';

export async function exportServiceTimelinePdf(
  services: ServiceData[],
  options: { vehicleLabel?: string } = {},
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const [regular, bold] = await Promise.all([
    fontToBase64('/fonts/Inter-Regular.ttf'),
    fontToBase64('/fonts/Inter-Bold.ttf'),
  ]);
  doc.addFileToVFS('Inter-Regular.ttf', regular);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', bold);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

  doc.setFont('Inter', 'bold');
  doc.setFontSize(16);
  doc.text('Oś czasu serwisu', 14, 16);

  doc.setFont('Inter', 'normal');
  doc.setFontSize(10);
  doc.text(options.vehicleLabel ?? 'Wszystkie pojazdy', 14, 22);
  doc.text(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`, 14, 27);

  const total = services.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

  autoTable(doc, {
    startY: 32,
    head: [['Data', 'Rodzaj', 'Pojazd', 'Miejsce usługi', 'Notatki', 'Koszt']],
    body: services.map((s) => [
      s.serviceDate,
      serviceTypeLabels[s.type] ?? s.type,
      `${s.vehicle.brand} ${s.vehicle.model}\n${s.vehicle.registrationNumber}`,
      s.providerName,
      s.notes ?? '',
      formatCost(Number(s.cost) || 0),
    ]),
    foot: [['', '', '', '', 'Łącznie', formatCost(total)]],
    styles: { font: 'Inter', fontSize: 9, cellPadding: 2 },
    headStyles: { font: 'Inter', fontStyle: 'bold' },
    footStyles: { font: 'Inter', fontStyle: 'bold' },
    columnStyles: { 5: { halign: 'right', cellWidth: 26 } },
    didDrawPage: () => {
      const { width, height } = doc.internal.pageSize;
      doc.setFont('Inter', 'normal');
      doc.setFontSize(8);
      doc.text(`Strona ${doc.getNumberOfPages()}`, width - 14, height - 8, { align: 'right' });
    },
  });

  const suffix = options.vehicleLabel
    ? options.vehicleLabel.replace(/[^\p{L}\p{N}]+/gu, '-')
    : 'wszystkie';
  doc.save(`os-czasu-serwisu-${suffix}.pdf`);
}
