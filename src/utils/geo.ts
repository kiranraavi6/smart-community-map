/**
 * Calculate Great-Circle Distance between two coordinates in Kilometers (Haversine formula)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) return '';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Standard 32-character Geohash encoder
 */
const BITS = [16, 8, 4, 2, 1];
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(latitude: number, longitude: number, precision: number = 8): string {
  let isEven = true;
  const latR = [-90.0, 90.0];
  const lonR = [-180.0, 180.0];
  let bit = 0;
  let ch = 0;
  let geohash = '';

  while (geohash.length < precision) {
    let mid;
    if (isEven) {
      mid = (lonR[0] + lonR[1]) / 2;
      if (longitude > mid) {
        ch |= BITS[bit];
        lonR[0] = mid;
      } else {
        lonR[1] = mid;
      }
    } else {
      mid = (latR[0] + latR[1]) / 2;
      if (latitude > mid) {
        ch |= BITS[bit];
        latR[0] = mid;
      } else {
        latR[1] = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

/**
 * Normalizes text for duplicate detection and fuzzy matching
 */
const CIVIC_SYNONYMS: Record<string, string> = {
  'govt': 'government',
  'gen': 'general',
  'hosp': 'hospital',
  'stn': 'station',
  'rd': 'road',
  'st': 'street',
  'ctr': 'center',
  'cent': 'center'
};

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => CIVIC_SYNONYMS[w] || w)
    .join('');
}

/**
 * Calculate token and bigram similarity index (0.0 to 1.0) for duplicate detection
 */
export function stringSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0.0;
  
  const norm1 = normalizeString(s1);
  const norm2 = normalizeString(s2);
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  // Split into words with synonym expansion
  const words1 = s1.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).map(w => CIVIC_SYNONYMS[w] || w);
  const words2 = s2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).map(w => CIVIC_SYNONYMS[w] || w);

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let intersection = 0;
  set1.forEach(w => {
    if (set2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Character bigrams for fine-grained edit tolerance
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bg1 = getBigrams(norm1);
  const bg2 = getBigrams(norm2);
  let bgOverlap = 0;
  bg1.forEach(bg => {
    if (bg2.has(bg)) bgOverlap++;
  });
  const dice = (bg1.size + bg2.size) > 0 ? (2 * bgOverlap) / (bg1.size + bg2.size) : 0;

  return Math.max(jaccard, dice);
}
