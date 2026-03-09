/**
 * DataTable component - Reusable table for displaying admin data
 * Supports columns, rows, and actions
 */
const DataTable = ({ columns, rows, actions }) => {
  return (
    <div className="card-panel table-card-panel">
      <table className="student-table modern">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
            {actions && actions.length > 0 && <th style={{ width: '120px' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="empty-state" style={{ textAlign: 'center', padding: '32px', color: 'var(--c-text-tertiary)' }}>
                No data available
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="action-cell">
                    <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                      {actions.map((action, i) => (
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
