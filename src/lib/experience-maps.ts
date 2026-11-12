// Google Maps URLs are the official keyless integration. No map request is made until the guest opens a link.
export function googleMapsSearch(query: string): string {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: query.trim() })}`;
}

export function googleMapsRoute(rawPoints: readonly string[]): {
  url: string | null;
  error: string | null;
} {
  const points = rawPoints.map((point) => point.trim()).filter(Boolean);
  if (points.length < 2) return { url: null, error: null };
  if (points.length > 5)
    return {
      url: null,
      error:
        "Per il percorso indicativo sono supportati al massimo cinque luoghi. Le altre esigenze possono essere indicate nelle note.",
    };
  const params = new URLSearchParams({
    api: "1",
    origin: points[0],
    destination: points[points.length - 1],
    travelmode: "driving",
  });
  if (points.length > 2) params.set("waypoints", points.slice(1, -1).join("|"));
  const url = `https://www.google.com/maps/dir/?${params}`;
  if (url.length > 2048)
    return {
      url: null,
      error:
        "Gli indirizzi sono troppo lunghi per il collegamento a Google Maps. Indichi nomi o indirizzi più brevi, senza eliminare le informazioni necessarie a riconoscere i luoghi.",
    };
  return { url, error: null };
}
