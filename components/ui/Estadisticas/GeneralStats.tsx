"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface GeneralStatsProps {
  promedio: number | string;
  mediana: number | string;
  rangoMin: number | string;
  rangoMax: number | string;
  totalParticipantes: number | string;
  scoreDistribution: Array<{
    calificacion: number | string;
    count: number | string;
    percentage: number | string;
  }>;
}

export default function GeneralStats({
  promedio,
  mediana,
  rangoMin,
  rangoMax,
  totalParticipantes,
  scoreDistribution,
}: GeneralStatsProps) {
  const safePromedio = Number(promedio) || 0;
  const safeMediana = Number(mediana) || 0;
  const safeRangoMin = Number(rangoMin) || 0;
  const safeRangoMax = Number(rangoMax) || 0;
  const safeTotalParticipantes = Number(totalParticipantes) || 0;

  const chartData = scoreDistribution.map((item) => ({
    puntuacion: Number(item.calificacion) || 0,
    usuarios: Number(item.count) || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safePromedio.toFixed(1)} / 10 puntos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Mediana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeMediana.toFixed(1)} / 10 puntos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Rango
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeRangoMin.toFixed(1)} - {safeRangoMax.toFixed(1)} puntos
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de puntos totales</CardTitle>
          <p className="text-sm text-gray-500">
            Total de participantes: {safeTotalParticipantes}
          </p>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay datos suficientes para mostrar la gráfica
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="puntuacion"
                  label={{
                    value: "Puntuación lograda",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  label={{
                    value: "# de usuarios que respondieron",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value} usuarios`,
                    "Cantidad",
                  ]}
                  labelFormatter={(label) => `Puntuación: ${label}`}
                />
                <Bar dataKey="usuarios" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
