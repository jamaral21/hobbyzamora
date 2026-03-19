import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface SalesChartProps {
  data: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas e Ingresos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,214,10,0.08)" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: '#8b8a9e' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: '#8b8a9e' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12121a',
                border: '1px solid rgba(255,214,10,0.12)',
                borderRadius: '8px',
                color: '#e8e6f0',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#ffd60a"
              strokeWidth={2}
              dot={{ fill: '#ffd60a', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={{ fill: '#00d4ff', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
