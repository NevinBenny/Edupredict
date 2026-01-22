import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Text } from 'recharts';

const StatDonutChart = ({ data, centerText, onSegmentClick }) => {
    // Academic colors with better contrast/professionalism
    const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

    return (
        <div className="donut-chart-wrapper">
            <div className="chart-main">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={75}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            onClick={(data) => onSegmentClick && onSegmentClick(data.name)}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color || COLORS[index % COLORS.length]}
                                    style={{ outline: 'none' }}
                                />
                            ))}
                        </Pie>
                        <text
                            x="50%"
                            y="48%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="chart-center-val"
                        >
                            {centerText}
                        </text>
                        <text
                            x="50%"
                            y="58%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="chart-center-label"
                        >
                            Students
                        </text>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="chart-legend-grid">
                {data.map((item, index) => (
                    <div
                        key={item.name}
                        className="legend-row"
                        onClick={() => onSegmentClick && onSegmentClick(item.name)}
                    >
                        <div className="legend-info">
                            <span className="legend-dot" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}></span>
                            <span className="legend-text">{item.name}</span>
                        </div>
                        <span className="legend-val">{item.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatDonutChart;
