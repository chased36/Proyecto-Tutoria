// app/asignatura/[id]/videos/page.tsx
import { getSubjectById } from "@/lib/db";
import { VideoPlayer } from "@/app/ui/Asignatura/video-player";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Videos de la asignatura",
  description: "Reproductor de videos para la asignatura seleccionada",
};

export default async function VideosPage({ params }: PageProps) {
  const { id } = await params;

  const subject = await getSubjectById(id);

  if (!subject) {
    notFound();
  }

  const { videos, name } = subject;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {videos.length === 0 ? (
        <p className="text-gray-500">
          No hay videos registrados para esta asignatura.
        </p>
      ) : (
        <section>
          <h2 className="text-2xl font-semibold mb-4">🎥 Videos</h2>
          <div className="bg-white p-4 rounded-lg border">
            <VideoPlayer videos={subject.videos} />
          </div>
        </section>
      )}
    </div>
  );
}
