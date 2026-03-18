import React from 'react';

const MetricCard = ({ label, value, unit, icon, trend, trendValue, color }) => {
    return (
        <div className="metric-card">
            <div className="metric-header">
                <span className="metric-label">{label}</span>
                <span className="metric-icon" style={{ color: color }}>{icon}</span>
            </div>
            <div className="metric-body">
                <span className="metric-value">{value}</span>
                {unit && <span className="metric-unit">{unit}</span>}
            </div>
            {trendValue && (
                <div className={`metric-footer ${trend}`}>
                    <span className="trend-value">{trendValue}</span>
                    <span className="trend-label">vs last sem</span>
                </div>
            )}
        </div>
    );
};

export default MetricCard;
