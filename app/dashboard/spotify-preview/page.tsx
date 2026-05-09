import Link from "next/link";

interface SpotifyPreviewPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SpotifyPreviewPage({
  searchParams,
}: SpotifyPreviewPageProps) {
  const params = await searchParams;
  const qValue = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = qValue ? qValue.trim() : "";
  const iframeSrc = query
    ? `https://open.spotify.com/embed/search/${encodeURIComponent(query)}`
    : "";

  return (
    <div className="bg-zinc-50 min-h-screen text-zinc-900">
      <nav className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Volver al dashboard
          </Link>
          <h1 className="font-semibold text-lg tracking-tight">
            Preview de Spotify
          </h1>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {query ? (
          <div className="bg-white border border-zinc-200 rounded-[24px] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <p className="text-sm text-zinc-500">Buscando:</p>
              <h2 className="text-xl font-semibold text-zinc-900">{query}</h2>
            </div>
            <div className="p-6">
              <iframe
                src={iframeSrc}
                width="100%"
                height="380"
                frameBorder="0"
                allow="encrypted-media"
                className="rounded-2xl"
                title="Spotify preview"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-[24px] p-8 text-center text-zinc-500">
            No hay una cancion para previsualizar.
          </div>
        )}
      </main>
    </div>
  );
}
