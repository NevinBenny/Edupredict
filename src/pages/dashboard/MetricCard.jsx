import React from 'react';

const MetricCard = ({ label, value, unit, icon, trend, trendValue, color }) => {
    return (
        <div className="card-panel metric-card animate-fade-in">
            <div className="metric-header">
                <span className="metric-label">{label}</span>
                <span
                    className="metric-icon-box"
                    style={{
                        color: color,
                        background: `${color}15` // 10-15% opacity
                    }}
                >
                    {icon}
                </span>
            </div>
            <div className="metric-body">
                <div className="metric-value-group">
                    <span className="metric-value">{value}</span>
                    {unit && <span className="metric-unit">{unit}</span>}
                </div>

                {trendValue && (
                    <div className={`metric-trend ${trend}`}>
                        <span className="trend-arrow">{trend === 'up' ? '↑' : '↓'}</span>
                        <span className="trend-value">{trendValue}</span>
                        <span className="trend-label">vs last sem</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricCard;
