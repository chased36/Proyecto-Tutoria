import type { PDF } from "@/lib/db";

interface PDFViewerProps {
  pdfs: PDF[];
}

export function PDFViewer({ pdfs }: PDFViewerProps) {
  if (pdfs.length === 0) {
    return <p className="text-gray-500 text-sm">No hay PDFs subidos</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">PDFs guardados:</h4>
      <ul className="space-y-1">
        {pdfs.map((pdf) => (
          <li
            key={pdf.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-gray-700">{pdf.filename}</span>
            <a
              href={pdf.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Ver PDF
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
