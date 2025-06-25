type Props = {
  url: string;
};

export default function PDFViewer({ url }: Props) {
  return (
    <div className="w-full h-[100vh] border rounded-md shadow">
      <iframe
        src={url}
        title="Visor de PDF"
        className="w-full h-full"
        frameBorder="0"
      />
    </div>
  );
}
