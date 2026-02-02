/**
 * .what = deterministic predicate that checks if a url is allowed for fetch
 * .why = blocks localhost, private IPs, and other unsafe urls before content inspection
 */
export const computeIsUrlAdmissible = (input: { url: string }): boolean => {
  // parse the url
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    // invalid url format
    return false;
  }

  // extract hostname and remove IPv6 brackets if present
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  // block localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return false;
  }

  // block private IP ranges
  const privateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // link-local
    /^fc00:/i, // IPv6 unique local
    /^fe80:/i, // IPv6 link-local
  ];
  if (privateRanges.some((r) => r.test(hostname))) {
    return false;
  }

  return true;
};
