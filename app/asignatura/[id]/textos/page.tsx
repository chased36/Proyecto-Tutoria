import { getSubjectById } from "@/lib/db";
import { PDFList } from "@/app/ui/Asignatura/PDFList";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PDFsPage({ params }: Props) {
  const { id } = await params;
  const subject = await getSubjectById(id);

  if (!subject) return <p>No se encontró la asignatura</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{subject.name}</h1>
      <PDFList pdfs={subject.pdfs} />
    </div>
  );
}
