/**
 * Transform a Cloudinary URL to add optimization parameters.
 * If the URL isn't from Cloudinary, return it unchanged.
 *
 * @param {string} url - The image URL
 * @param {object} options
 * @param {number} options.width - Desired width
 * @param {string} options.quality - Quality: 'auto', 'auto:low', 'auto:good', etc.
 * @param {string} options.format - Format: 'auto' (serves WebP/AVIF based on browser)
 * @param {string} options.crop - Crop mode: 'fill', 'fit', 'limit', etc.
 * @returns {string}
 */
export function cloudinaryUrl(url, { width, quality = 'auto', format = 'auto', crop = 'fill' } = {}) {
  if (!url || !url.includes('res.cloudinary.com')) return url

  const transforms = [`f_${format}`, `q_${quality}`]
  if (width) {
    transforms.push(`w_${width}`, `c_${crop}`)
  }

  // Insert transforms after /upload/
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`)
}

/**
 * Get a responsive Cloudinary srcSet string for use with <img>.
 */
export function cloudinarySrcSet(url, widths = [400, 800, 1200]) {
  if (!url || !url.includes('res.cloudinary.com')) return undefined
  return widths.map(w => `${cloudinaryUrl(url, { width: w })} ${w}w`).join(', ')
}
