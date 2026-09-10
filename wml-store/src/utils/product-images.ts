const VTEX_IMAGE_PATH = /(\/arquivos\/ids\/)([^/?#]+)(\/[^?#]*)/i;

/**
 * Requests a larger rendition of a VTEX catalog image for checkout cards.
 * VTEX often puts a small `-55-55` rendition in the order form image URL;
 * replacing that segment avoids scaling a thumbnail into a larger card.
 */
export function getCheckoutProductImageUrl(imageUrl: string, width = 600, height = 800) {
  const value = imageUrl.trim();
  if (!value) return '';

  return value.replace(
    VTEX_IMAGE_PATH,
    (_match, prefix: string, imageId: string, filePath: string) => {
      const originalImageId = imageId.replace(/-\d+-\d+$/, '');
      return `${prefix}${originalImageId}-${width}-${height}${filePath}`;
    },
  );
}
