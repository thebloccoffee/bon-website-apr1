/**
 * Share an article to Instagram Stories using Web Share Level 2 file sharing.
 *
 * When an image *file* is shared from the native share sheet, Instagram opens
 * the Story composer with that image pre-loaded — which the plain text share
 * ({ title, url }) does not reliably do.
 *
 * @param {{ imageUrl?: string, title: string, url: string }} args
 * @returns {'shared-files' | 'shared-text' | 'cancelled' | 'unsupported'}
 */
export async function shareToInstagramStory({ imageUrl, title, url }) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  if (!isMobile || typeof navigator.share !== 'function') {
    return 'unsupported';
  }

  // Try file share first so Instagram opens the Story composer directly.
  if (imageUrl) {
    try {
      const res = await fetch(imageUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const type = blob.type || 'image/jpeg';
        const file = new File([blob], 'cover.' + extFromMime(type), { type });
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title });
          return 'shared-files';
        }
      }
    } catch (e) {
      // Network/CORS issues or user cancelled — fall through to text share.
    }
  }

  try {
    await navigator.share({ title, url });
    return 'shared-text';
  } catch (e) {
    // User dismissed the share sheet.
    return 'cancelled';
  }
}

function extFromMime(type) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return map[type] || 'jpg';
}
