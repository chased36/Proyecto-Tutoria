import type { Video } from "@/lib/db";

interface VideoPlayerProps {
  videos: Video[];
}

export function VideoPlayer({ videos }: VideoPlayerProps) {
  if (videos.length === 0) {
    return <p className="text-gray-500 text-sm">No hay videos disponibles</p>;
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    );
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url;
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Videos disponibles:</h4>
      <div className="grid gap-4">
        {videos.map((video) => (
          <div key={video.id} className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-gray-50">
              <h5 className="font-medium">{video.title}</h5>
            </div>
            <div className="aspect-video">
              <iframe
                src={getYouTubeEmbedUrl(video.url)}
                title={video.title}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
