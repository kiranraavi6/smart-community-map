import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceKm, formatDistance, encodeGeohash, stringSimilarity, normalizeString } from '../src/utils/geo';

describe('Geographic Utility Tests', () => {
  it('calculates Haversine distance between Vijayawada landmarks accurately', () => {
    // Vijayawada Railway Station: 16.5186, 80.6200
    // Kanaka Durga Temple: 16.5152, 80.6052
    const distance = calculateDistanceKm(16.5186, 80.6200, 16.5152, 80.6052);
    assert(distance > 1.4 && distance < 1.8, `Expected ~1.6 km, got ${distance}`);
  });

  it('returns 0 for identical coordinates', () => {
    const distance = calculateDistanceKm(16.5062, 80.6480, 16.5062, 80.6480);
    assert.equal(distance, 0);
  });

  it('formats distances correctly for meters and kilometers', () => {
    assert.equal(formatDistance(0.45), '450 m away');
    assert.equal(formatDistance(1.234), '1.2 km away');
    assert.equal(formatDistance(15.67), '15.7 km away');
    assert.equal(formatDistance(undefined), '');
  });

  it('encodes standard Geohash strings with correct precision', () => {
    const hash = encodeGeohash(16.5062, 80.6480, 8);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 8);
    // Nearby coordinates share common geohash prefix
    const nearbyHash = encodeGeohash(16.5063, 80.6481, 8);
    assert.equal(hash.substring(0, 5), nearbyHash.substring(0, 5));
  });

  it('normalizes strings and detects semantic duplicate names', () => {
    const norm1 = normalizeString('Govt General Hospital (Old Block)!');
    const norm2 = normalizeString('govt-general-hospital-old-block');
    assert.equal(norm1, norm2);

    const sim = stringSimilarity('Government Hospital', 'Govt Hospital');
    assert(sim >= 0.8, 'Expected high similarity between matching name tokens');
  });
});
