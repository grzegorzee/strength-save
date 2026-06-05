const getYouTubeVideoId = (url?: string): string | null => {
  if (!url) return null;

  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|watch\?v=))([\w-]{11})/);
  return match?.[1] ?? null;
};

export const getYouTubeEmbedUrl = (url?: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;
};

export const getYouTubeThumbnailUrl = (url?: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
};
