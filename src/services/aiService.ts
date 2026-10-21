import { GoogleGenAI } from '@google/genai';
import { CommunityAsset } from '../types';
import { calculateDistanceKm } from '../utils/geo';

// Safe lazy initialization pattern
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  try {
    if (!aiClient) {
      const apiKey = typeof process !== 'undefined' && process.env?.GEMINI_API_KEY
        ? process.env.GEMINI_API_KEY
        : (import.meta as any).env?.VITE_GEMINI_API_KEY;
      
      if (apiKey) {
        aiClient = new GoogleGenAI({ apiKey });
      } else {
        aiClient = new GoogleGenAI();
      }
    }
    return aiClient;
  } catch (err) {
    console.warn('Gemini client initialization notice (falling back to deterministic semantic grounding):', err);
    return null;
  }
}

export interface AIQueryResponse {
  summary: string;
  matchedAssetIds: string[];
  suggestedAction?: string;
  filtersUsed: {
    category?: string;
    radiusKm?: number;
    accessibilityRequirement?: string;
  };
}

/**
 * Intelligent Grounded Resource Query Assistant.
 * Strictly searches real database records and does not invent facilities.
 */
export async function queryCommunityAssistant(
  userQuery: string,
  availableAssets: CommunityAsset[],
  userLocation?: { lat: number; lng: number }
): Promise<AIQueryResponse> {
  const queryLower = userQuery.toLowerCase();

  // 1. Deterministic filter and rank based on user inquiry
  let filtered = availableAssets.filter(asset => asset.verificationStatus === 'verified');

  // Accessibility check
  const asksAccessibility = queryLower.includes('wheelchair') || queryLower.includes('accessible') || queryLower.includes('disability') || queryLower.includes('ramp');
  if (asksAccessibility) {
    filtered = filtered.filter(a => a.accessibility && a.accessibility.length > 0);
  }

  // Category matching
  const categoryKeywords: Record<string, string[]> = {
    healthcare: ['hospital', 'clinic', 'doctor', 'health', 'medical', 'medicine', 'phc', 'trauma', 'emergency'],
    education: ['school', 'college', 'library', 'study', 'education', 'books', 'university'],
    water_sanitation: ['water', 'drinking', 'ro plant', 'tap', 'purified', 'toilet', 'sanitation'],
    government_services: ['meeseva', 'aadhaar', 'ration', 'collector', 'municipal', 'police', 'tax', 'governance'],
    transportation: ['bus', 'train', 'railway', 'station', 'transport', 'stand', 'halt'],
    environment_parks: ['park', 'garden', 'green', 'recreation', 'island', 'lake', 'trees'],
    emergency_services: ['fire', 'ambulance', 'rescue', 'disaster']
  };

  let matchedCategory: string | undefined;
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => queryLower.includes(k))) {
      matchedCategory = cat;
      filtered = filtered.filter(a => a.categoryId === cat);
      break;
    }
  }

  // Distance computation if user coordinates provided
  if (userLocation) {
    filtered = filtered.map(a => ({
      ...a,
      distanceKm: calculateDistanceKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude)
    }));

    // Radius detection
    let maxRadius = 10;
    if (queryLower.includes('1 km') || queryLower.includes('1km')) maxRadius = 1;
    else if (queryLower.includes('5 km') || queryLower.includes('5km')) maxRadius = 5;
    else if (queryLower.includes('2 km') || queryLower.includes('2km')) maxRadius = 2;
    else if (queryLower.includes('25 km') || queryLower.includes('25km')) maxRadius = 25;

    filtered = filtered.filter(a => (a.distanceKm || 0) <= maxRadius);
    filtered.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }

  const topMatches = filtered.slice(0, 5);
  const matchedIds = topMatches.map(m => m.id);

  // 2. Format grounding context for Gemini
  const contextSummary = topMatches.map(a => 
    `- Name: ${a.name} | Category: ${a.categoryId} | Location: ${a.address}, ${a.city} | Facilities: ${a.facilities.join(', ')} | Accessibility: ${a.accessibility.join(', ') || 'Standard'}`
  ).join('\n');

  // Check if Gemini API is available
  const ai = getAIClient();
  if (ai && topMatches.length > 0) {
    try {
      const prompt = `You are the civic Community Resource Assistant for the Community Asset Map.
A citizen asked: "${userQuery}".
Here are the REAL, verified records retrieved from the database:
${contextSummary}

Rules:
1. Ground your answer ONLY on the provided records. Never invent facilities, phone numbers, or addresses.
2. If accessible facilities were matched, mention their specific accessibility accommodations.
3. Keep the response concise, encouraging, and civic-minded (2 to 3 paragraphs max).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      if (response.text) {
        return {
          summary: response.text,
          matchedAssetIds: matchedIds,
          filtersUsed: {
            category: matchedCategory,
            accessibilityRequirement: asksAccessibility ? 'Wheelchair / Step-free accessibility' : undefined
          }
        };
      }
    } catch (err) {
      console.warn('Gemini AI inference fallback:', err);
    }
  }

  // Graceful deterministic grounding fallback
  if (topMatches.length === 0) {
    return {
      summary: `I searched the verified civic database, but could not find any active verified assets matching "${userQuery}" within the specified area. You can explore the interactive map or submit a community need if this resource is missing.`,
      matchedAssetIds: [],
      filtersUsed: { category: matchedCategory }
    };
  }

  const listDescription = topMatches.map(m => 
    `• ${m.name} (${m.city}) - Located at ${m.address}${m.operatingHours ? ` | Hours: ${m.operatingHours}` : ''}`
  ).join('\n');

  return {
    summary: `Found ${topMatches.length} verified community resource(s) matching your request:\n\n${listDescription}\n\nYou can click the asset cards below to view complete directions, accessibility notes, and contact numbers.`,
    matchedAssetIds: matchedIds,
    filtersUsed: {
      category: matchedCategory,
      accessibilityRequirement: asksAccessibility ? 'Wheelchair / Accessibility features' : undefined
    }
  };
}
