import { describe, expect, it } from 'vitest';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from '@/lib/exercise-media';

describe('exercise media helpers', () => {
  it('builds thumbnail and embed URLs from a YouTube watch URL', () => {
    const url = 'https://www.youtube.com/watch?v=GxXifj9_y5o';

    expect(getYouTubeThumbnailUrl(url)).toBe('https://i.ytimg.com/vi/GxXifj9_y5o/hqdefault.jpg');
    expect(getYouTubeEmbedUrl(url)).toBe('https://www.youtube.com/embed/GxXifj9_y5o?rel=0&modestbranding=1');
  });

  it('supports short and embed URLs', () => {
    expect(getYouTubeThumbnailUrl('https://youtu.be/GxXifj9_y5o')).toContain('GxXifj9_y5o');
    expect(getYouTubeEmbedUrl('https://www.youtube.com/embed/GxXifj9_y5o')).toContain('GxXifj9_y5o');
  });

  it('returns null for missing or unsupported URLs', () => {
    expect(getYouTubeThumbnailUrl()).toBeNull();
    expect(getYouTubeEmbedUrl('https://example.com/video')).toBeNull();
  });
});
