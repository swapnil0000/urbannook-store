{
  /* <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div
    className="lg:col-span-2 rounded-xl p-5"
    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
        Revenue & Orders — Last 30 Days
      </h3>
    </div>
    {loading ? (
      <Skeleton className="h-48 w-full rounded-lg" />
    ) : chart.length === 0 ? (
      <div
        className="flex items-center justify-center h-48 text-sm"
        style={{ color: "var(--text-3)" }}
      >
        No data yet
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={chart}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={axisColor} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 10, fill: textColor }}
            axisLine={{ stroke: axisColor }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="rev"
            orientation="right"
            tick={{ fontSize: 10, fill: textColor }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
            }
          />
          <YAxis
            yAxisId="ord"
            orientation="left"
            tick={{ fontSize: 10, fill: textColor }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#111111"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="ord"
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke="#888888"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )}
  </div>

  <div
    className="rounded-xl p-5 flex flex-col"
    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
  >
    <h3
      className="text-sm font-semibold mb-4"
      style={{ color: "var(--text-1)" }}
    >
      Sales Channel Split
    </h3>
    {loading ? (
      <Skeleton className="h-48 w-full rounded-lg" />
    ) : pieData[0]?.value === 0 && pieData[1]?.value === 0 ? (
      <div
        className="flex items-center justify-center flex-1 text-sm"
        style={{ color: "var(--text-3)" }}
      >
        No orders yet
      </div>
    ) : (
      <div className="flex-1 flex flex-col items-center justify-center">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val, name) => [val, name]}
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text-1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          {pieData.map((item, i) => (
            <div
              key={item.name}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--text-2)" }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: PIE_COLORS[i] }}
              />
              <span>{item.name}</span>
              <span
                className="font-semibold"
                style={{ color: "var(--text-1)" }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>; */
}

import React from "react";

export const Analytics = () => {
  return (
    <>
      <div>Analytics</div>
      <div>Designing bro </div>
    </>
  );
};
