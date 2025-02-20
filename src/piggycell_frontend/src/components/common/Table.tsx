import { TableProps } from "./types";

export const Table = ({
  headers,
  rows,
  className = "",
  striped = false,
  hoverable = false,
  compact = false,
  bordered = false,
}: TableProps) => {
  const tableClasses = [
    "w-full",
    "table-auto",
    bordered ? "border border-gray-200" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const cellClasses = [
    bordered ? "border border-gray-200" : "border-b border-gray-200",
    compact ? "px-3 py-2" : "px-6 py-4",
  ]
    .filter(Boolean)
    .join(" ");

  const headerCellClasses = [
    cellClasses,
    "text-left",
    "font-semibold",
    "text-gray-900",
    "bg-gray-50",
  ].join(" ");

  const rowClasses = [hoverable ? "hover:bg-gray-50" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <table className={tableClasses}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} className={headerCellClasses}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={[
                rowClasses,
                striped && rowIndex % 2 === 1 ? "bg-gray-50" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cellClasses}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
