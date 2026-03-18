/**
 * DataTable component - Reusable table for displaying admin data
 * Supports columns, rows, and actions
 */
const DataTable = ({ columns, rows, actions }) => {
  return (
    <div className="data-table-container">
      <table className="simple-table">
        <thead>
          <tr>
            <th style={{ width: '50px' }}>#</th>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width, textAlign: col.align || 'left' }}>
                {col.label}
              </th>
            ))}
            {actions && actions.length > 0 && <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 2 : 1)} className="empty-state">
                No data available
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id || row.student_id || idx}>
                <td style={{ width: '50px', color: 'var(--c-text-tertiary)', fontSize: '12px', fontWeight: 600 }}>
                  {idx + 1}
                </td>
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="action-cell">
                    <div className="action-buttons" style={{ justifyContent: 'center' }}>
                      {actions.map((action) => (
                        <button
                          key={typeof action.label === 'function' ? action.label(row) : action.label}
                          className={`action-btn action-btn-${action.variant || 'primary'}`}
                          onClick={() => action.onClick(row)}
                          title={typeof action.label === 'function' ? action.label(row) : action.label}
                        >
                          {action.icon ? <span>{action.icon}</span> : (typeof action.label === 'function' ? action.label(row) : action.label)}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
