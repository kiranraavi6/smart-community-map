import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAssetInput, validateNeedInput, validateReportInput } from '../src/utils/validation';

describe('Security & Input Validation Tests', () => {
  it('accepts valid community asset input', () => {
    const validAsset = {
      name: 'Bhavani Island Boat Jetty',
      categoryId: 'parks_recreation',
      description: 'Recreation island jetty with boat transfers, eco-tourism, and public facilities.',
      address: 'Bhavani Island, Krishna River, Vijayawada',
      city: 'Vijayawada',
      latitude: 16.5167,
      longitude: 80.5975,
      accessibility: ['Wheelchair accessible ramps'],
      facilities: ['Restrooms', 'Drinking water', 'Life jackets'],
      imageUrls: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb']
    };

    const res = validateAssetInput(validAsset);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
  });

  it('rejects asset with invalid category or short description', () => {
    const invalidAsset = {
      name: 'Valid Name Here',
      categoryId: 'unauthorized_category_name',
      description: 'Short',
      address: 'Valid Address 123',
      city: 'Vijayawada',
      latitude: 16.5,
      longitude: 80.6
    };

    const res = validateAssetInput(invalidAsset);
    assert.equal(res.isValid, false);
    assert(res.errors.some(e => e.includes('category')));
    assert(res.errors.some(e => e.includes('Description')));
  });

  it('rejects out-of-bound geographic coordinates', () => {
    const outOfBounds = {
      name: 'Invalid Coordinates Facility',
      categoryId: 'healthcare',
      description: 'A health facility with bogus coordinates.',
      address: '123 Test Street, Vijayawada',
      city: 'Vijayawada',
      latitude: 195.0, // Invalid latitude
      longitude: -200.0 // Invalid longitude
    };

    const res = validateAssetInput(outOfBounds);
    assert.equal(res.isValid, false);
    assert(res.errors.some(e => e.includes('Latitude must be between -90 and 90')));
    assert(res.errors.some(e => e.includes('Longitude must be between -180 and 180')));
  });

  it('blocks untrusted image domains to prevent SSRF and hotlinking hazards', () => {
    const untrustedImage = {
      name: 'Civic Center Test',
      categoryId: 'community_centers',
      description: 'Community meeting center for civic discussions.',
      address: 'MG Road, Vijayawada',
      city: 'Vijayawada',
      latitude: 16.5,
      longitude: 80.6,
      imageUrls: ['https://malicious-external-host.com/tracker.png']
    };

    const res = validateAssetInput(untrustedImage);
    assert.equal(res.isValid, false);
    assert(res.errors.some(e => e.includes('not authorized')));
  });

  it('validates community needs inputs', () => {
    const validNeed = {
      title: 'Need Drinking Water ATM near Old Bus Stand',
      categoryId: 'water_sanitation',
      description: 'Commuters and local street vendors have no access to clean drinking water during summer afternoon hours.',
      locality: 'Old Bus Stand Area',
      latitude: 16.512,
      longitude: 80.625
    };

    const res = validateNeedInput(validNeed);
    assert.equal(res.isValid, true);
  });

  it('validates inaccuracy reports inputs', () => {
    const validReport = {
      assetId: 'asset-123',
      reason: 'Permanently Closed / Non-existent',
      description: 'This center was relocated to the municipal complex 2 months ago.'
    };

    const res = validateReportInput(validReport);
    assert.equal(res.isValid, true);

    const invalidReport = {
      assetId: '',
      reason: '',
      description: 'short'
    };
    const resInvalid = validateReportInput(invalidReport);
    assert.equal(resInvalid.isValid, false);
  });
});
