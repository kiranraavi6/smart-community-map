/**
 * Security & Input Validation Layer
 * Enforces sanitization, length boundaries, coordinate limits, and image URL restrictions.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Trusted hostnames for civic resource imagery
const ALLOWED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'wikimedia.org',
  'upload.wikimedia.org'
];

/**
 * Validates asset submission input against strict boundaries
 */
export function validateAssetInput(data: Partial<{
  name: string;
  categoryId: string;
  description: string;
  address: string;
  landmark?: string;
  city: string;
  latitude: number;
  longitude: number;
  contactNumber?: string;
  website?: string;
  operatingHours?: string;
  accessibility?: string[];
  facilities?: string[];
  imageUrls?: string[];
}> | any): ValidationResult {
  const errors: string[] = [];

  // Name
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Resource name is required.');
  } else if (data.name.trim().length < 3 || data.name.trim().length > 120) {
    errors.push('Resource name must be between 3 and 120 characters.');
  }

  // Category
  const validCategories = [
    'healthcare',
    'education',
    'water_sanitation',
    'public_infrastructure',
    'community_centers',
    'government_services',
    'ngos_social',
    'shelters_relief',
    'parks_recreation',
    'waste_management',
    'emergency_response'
  ];
  if (!data.categoryId || !validCategories.includes(data.categoryId)) {
    errors.push('A valid category must be selected.');
  }

  // Description
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required.');
  } else if (data.description.trim().length < 10 || data.description.trim().length > 1500) {
    errors.push('Description must be between 10 and 1500 characters.');
  }

  // Address
  if (!data.address || typeof data.address !== 'string') {
    errors.push('Address is required.');
  } else if (data.address.trim().length < 5 || data.address.trim().length > 250) {
    errors.push('Address must be between 5 and 250 characters.');
  }

  // City
  if (!data.city || typeof data.city !== 'string' || data.city.trim().length < 2 || data.city.trim().length > 80) {
    errors.push('City must be between 2 and 80 characters.');
  }

  // Landmark (optional)
  if (data.landmark && data.landmark.length > 150) {
    errors.push('Landmark must not exceed 150 characters.');
  }

  // Latitude / Longitude (India boundary checks: ~6 to ~37 Lat, ~68 to ~98 Lon)
  if (typeof data.latitude !== 'number' || isNaN(data.latitude)) {
    errors.push('Latitude must be a valid number.');
  } else if (data.latitude < -90 || data.latitude > 90) {
    errors.push('Latitude must be between -90 and 90.');
  }

  if (typeof data.longitude !== 'number' || isNaN(data.longitude)) {
    errors.push('Longitude must be a valid number.');
  } else if (data.longitude < -180 || data.longitude > 180) {
    errors.push('Longitude must be between -180 and 180.');
  }

  // Contact number (optional)
  if (data.contactNumber && data.contactNumber.trim()) {
    const phone = data.contactNumber.trim();
    if (phone.length > 30) {
      errors.push('Contact number must not exceed 30 characters.');
    }
  }

  // Website (optional)
  if (data.website && data.website.trim()) {
    const web = data.website.trim();
    if (!web.startsWith('http://') && !web.startsWith('https://')) {
      errors.push('Website must begin with http:// or https://');
    } else if (web.length > 300) {
      errors.push('Website URL must not exceed 300 characters.');
    }
  }

  // Image URLs validation
  if (data.imageUrls && Array.isArray(data.imageUrls)) {
    if (data.imageUrls.length > 5) {
      errors.push('Maximum 5 photos allowed per resource.');
    }
    for (const url of data.imageUrls) {
      if (typeof url !== 'string' || !url.startsWith('https://')) {
        errors.push('Image URLs must be secure https:// links.');
        break;
      }
      try {
        const parsed = new URL(url);
        const isAllowed = ALLOWED_IMAGE_HOSTS.some(host => 
          parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
        );
        if (!isAllowed) {
          errors.push(`Image URL host '${parsed.hostname}' is not authorized. Allowed hosts: Unsplash, Wikimedia, Firebase Storage.`);
          break;
        }
      } catch {
        errors.push('Invalid image URL format.');
        break;
      }
    }
  }

  // Accessibility & Facilities arrays
  if (data.accessibility && (!Array.isArray(data.accessibility) || data.accessibility.length > 15)) {
    errors.push('Accessibility items must be an array of maximum 15 items.');
  }
  if (data.facilities && (!Array.isArray(data.facilities) || data.facilities.length > 20)) {
    errors.push('Facilities items must be an array of maximum 20 items.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates Community Need input
 */
export function validateNeedInput(data: {
  title: string;
  categoryId: string;
  description: string;
  locality: string;
  latitude: number;
  longitude: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length < 5 || data.title.trim().length > 150) {
    errors.push('Title must be between 5 and 150 characters.');
  }
  if (!data.locality || data.locality.trim().length < 2 || data.locality.trim().length > 100) {
    errors.push('Locality must be between 2 and 100 characters.');
  }
  if (!data.description || data.description.trim().length < 10 || data.description.trim().length > 1000) {
    errors.push('Description must be between 10 and 1000 characters.');
  }
  if (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90) {
    errors.push('Latitude must be between -90 and 90.');
  }
  if (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180) {
    errors.push('Longitude must be between -180 and 180.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates Inaccuracy Report input
 */
export function validateReportInput(data: {
  assetId: string;
  reason: string;
  description: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.assetId || typeof data.assetId !== 'string') {
    errors.push('Asset ID is required.');
  }
  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length < 3) {
    errors.push('Report reason is required.');
  }
  if (!data.description || data.description.trim().length < 10 || data.description.trim().length > 1000) {
    errors.push('Report description must be between 10 and 1000 characters.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
