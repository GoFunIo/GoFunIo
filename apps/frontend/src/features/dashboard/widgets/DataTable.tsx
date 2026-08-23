import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import classNames from 'classnames';
import { Column } from '@/types/table';

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  footer?: boolean;
  footerLabel?: string;
  disabled?: (item: T) => boolean;
  hide?: (item: T) => boolean;
}

export const DataTable = <T extends { id: string | number }>({
  columns,
  data,
  onEdit,
  onDelete,
  footer = true,
  footerLabel,
  disabled,
  hide,
}: DataTableProps<T>) => {
  return (
    <div className="w-full rounded-[6px] border border-icon bg-bg-page">
      <table className="w-full text-sm border-collapse">
        <thead className=" hidden lg:table-header-group border-b border-icon">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="py-[16px] pl-[25px] text-left font-normal text-content-primary text-[14px]"
              >
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="text-right pr-[25px] font-normal text-content-primary text-[14px]">
                Akcje
              </th>
            )}
          </tr>
        </thead>

        <tbody className="block lg:table-row-group divide-y divide-icon">
          {data.map((item) => {
            const hideEl = hide?.(item) ?? false;
            const disableEl = disabled?.(item) ?? false;

            return (
              <tr
                key={item.id}
                className="block md:py-[20px] py-[16px] md:px-[25px] px-[20px] lg:table-row"
              >
                {columns.map((col, colIdx) => {
                  const value = item[col.accessor as keyof T];
                  return (
                    <td
                      key={colIdx}
                      className="lg:py-[16px] lg:pl-[25px] pb-[8px] flex justify-between items-center lg:table-cell"
                    >
                      <span className="lg:hidden font-normal text-content-primary text-[14px]">
                        {col.header}
                      </span>
                      <div
                        className={classNames('text-[14px] text-content-secondary', {
                          'text-content-primary font-bold': col.isImportant,
                        })}
                      >
                        {col.render ? col.render(value, item) : (value as React.ReactNode)}
                      </div>
                    </td>
                  );
                })}

                {(onEdit || onDelete) && (
                  <td className="lg:py-[12px] lg:px-[25px] flex justify-end gap-3 lg:table-cell">
                    <span className="lg:hidden font-normal text-content-primary text-[14px] mr-auto">
                      Akcje
                    </span>
                    {!hideEl && (
                      <div className="flex gap-2.5 lg:justify-end">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="cursor-pointer text-gray-400 hover:text-primary custom-transition"
                          >
                            <Pencil size={18} className="text-content-primary" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            disabled={disableEl}
                            onClick={() => onDelete(item)}
                            className={classNames(
                              'cursor-pointer text-gray-400 hover:text-alert custom-transition',
                              {
                                'opacity-50 pointer-events-none': disableEl,
                              },
                            )}
                          >
                            <Trash2 size={18} className="text-content-primary" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {footer && (
        <div className="border-t border-icon flex items-center justify-between py-[16px] md:px-[25px] px-[20px] w-full">
          <p className="text-content-primary font-semibold">{data.length} wpisów</p>
          {footerLabel && <p className="text-content-primary font-semibold block">{footerLabel}</p>}
        </div>
      )}
    </div>
  );
};
