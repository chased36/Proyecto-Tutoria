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
  Cell,
  LabelList,
} from "recharts";

interface Answer {
  pregunta_id: string;
  pregunta: string;
  respuesta: string;
  count: number | string;
  percentage: number | string;
  es_correcta: boolean;
}

interface AnswerDistributionProps {
  questionId: string;
  questionText: string;
  questionIndex: number;
  answers: Answer[];
  totalCorrect: number | string;
  totalAnswers: number | string;
}

const CustomYAxisTick = ({ x, y, payload }: any) => {
  const answer = payload.value;
  const isCorrect = answer.startsWith("✓ ");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill={isCorrect ? "#22c55e" : "#666"}
        fontSize={12}
      >
        {answer}
      </text>
    </g>
  );
};

const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width + 5}
      y={y + 10}
      fill="#666"
      fontSize={12}
      textAnchor="start"
    >
      {value}
    </text>
  );
};

export default function AnswerDistribution({
  questionId,
  questionText,
  questionIndex,
  answers,
  totalCorrect,
  totalAnswers,
}: AnswerDistributionProps) {
  const safeTotalCorrect = Number(totalCorrect) || 0;
  const safeTotalAnswers = Number(totalAnswers) || 0;

  const chartData = answers.map((answer) => {
    const count = Number(answer.count) || 0;
    const percentage = Number(answer.percentage) || 0;
    const displayAnswer = answer.es_correcta
      ? `✓ ${answer.respuesta}`
      : answer.respuesta;

    return {
      respuesta: displayAnswer,
      usuarios: count,
      porcentaje: percentage,
      esCorrecta: answer.es_correcta,
      label: `${count} (${percentage.toFixed(0)}%)`,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pregunta {questionIndex}</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          {safeTotalCorrect}/{safeTotalAnswers} respuestas correctas
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={Math.max(200, answers.length * 60)}
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              dataKey="respuesta"
              type="category"
              tick={<CustomYAxisTick />}
            />
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value} usuarios (${props.payload.porcentaje.toFixed(0)}%)`,
                "Respuestas",
              ]}
            />
            <Bar dataKey="usuarios" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.esCorrecta ? "#22c55e" : "#d1d5db"}
                />
              ))}
              <LabelList content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
