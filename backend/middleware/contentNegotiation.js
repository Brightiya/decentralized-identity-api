/**
 * Forces Content-Language: en for all responses
 * Strategy: Serve everything in English and let modern browsers handle translation
 * Also sends Vary header for correct caching behavior
 */
export const forceEnglishContentLanguage = (req, res, next) => {
  // Signal to browsers, proxies, CDNs: content is in English
  res.setHeader('Content-Language', 'en');

  // Helps caches understand that responses may differ by language preference
  // (even though we currently serve the same content regardless)
  res.setHeader('Vary', 'Accept-Language');

  next();
};