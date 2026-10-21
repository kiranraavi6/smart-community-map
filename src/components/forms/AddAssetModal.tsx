import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  MapPin, 
  Check, 
  AlertCircle, 
  Compass, 
  Building, 
  FileText,
  Clock,
  Phone,
  Globe,
  Upload,
  Image as ImageIcon,
  Loader2,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { ASSET_CATEGORIES, ACCESSIBILITY_FEATURES, COMMON_FACILITIES, DEFAULT_MAP_CENTER } from '../../constants/categories';
import { submitAsset } from '../../services/assetService';
import { uploadAssetImage, validateImageFile } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';
import { CommunityAsset } from '../../types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newId: string) => void;
  defaultLocation?: { lat: number; lng: number };
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultLocation
}) => {
  const { currentUser, userProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('healthcare');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState(DEFAULT_MAP_CENTER.city || 'Narsapur');
  const [state, setState] = useState(DEFAULT_MAP_CENTER.state || 'Andhra Pradesh');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState(defaultLocation?.lat?.toString() || DEFAULT_MAP_CENTER.lat.toString());
  const [longitude, setLongitude] = useState(defaultLocation?.lng?.toString() || DEFAULT_MAP_CENTER.lng.toString());
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [selectedAccessibility, setSelectedAccessibility] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState('');

  if (!isOpen) return null;

  const toggleAccessibility = (item: string) => {
    setSelectedAccessibility(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleFacility = (item: string) => {
    setSelectedFacilities(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        alert('Could not retrieve GPS coordinates: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Invalid image file.');
      return;
    }

    if (!currentUser) {
      setErrorMsg('Please sign in before uploading facility photos.');
      return;
    }

    setErrorMsg(null);
    setUploadingImage(true);
    setUploadProgress(0);

    try {
      // Use temporary or generated asset identifier
      const tempAssetId = `temp_${Date.now()}`;
      const downloadUrl = await uploadAssetImage(tempAssetId, file, (progress) => {
        setUploadProgress(progress);
      });

      setUploadedImages(prev => [...prev, downloadUrl]);
    } catch (err: any) {
      console.error('Storage upload error:', err);
      setErrorMsg(err.message || 'Image upload to Firebase Storage failed.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleAddManualUrl = () => {
    if (!manualImageUrl.trim()) return;
    try {
      new URL(manualImageUrl.trim());
      setUploadedImages(prev => [...prev, manualImageUrl.trim()]);
      setManualImageUrl('');
    } catch {
      setErrorMsg('Please enter a valid image URL starting with http:// or https://');
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setWarningMsg(null);

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMsg('Please provide a valid latitude between -90 and 90.');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setErrorMsg('Please provide a valid longitude between -180 and 180.');
      return;
    }
    if (!name.trim() || !address.trim() || !description.trim()) {
      setErrorMsg('Facility name, address, and description are required.');
      return;
    }

    if (!currentUser) {
      setErrorMsg('You must be signed in to submit a civic resource.');
      return;
    }

    setSubmitting(true);
    try {
      const submitterId = currentUser.uid;
      const submitterName = userProfile?.displayName || userProfile?.name || currentUser.displayName || 'Active Citizen';

      const allImages = [...uploadedImages];
      if (manualImageUrl.trim()) {
        allImages.push(manualImageUrl.trim());
      }

      const assetPayload: Partial<CommunityAsset> = {
        name: name.trim(),
        categoryId,
        category: categoryId,
        subcategory: subcategory.trim() || undefined,
        description: description.trim(),
        address: address.trim(),
        landmark: landmark.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim() || undefined,
        latitude: latNum,
        longitude: lngNum,
        phone: contactNumber.trim() || undefined,
        contactNumber: contactNumber.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        openingHours: operatingHours.trim() || undefined,
        operatingHours: operatingHours.trim() || undefined,
        accessibility: selectedAccessibility,
        facilities: selectedFacilities,
        images: allImages,
        imageUrls: allImages,
        createdBy: submitterId,
        submittedBy: submitterId,
        submittedByName: submitterName
      };

      const result = await submitAsset(assetPayload, submitterId, submitterName);
      
      if (result.duplicateWarning) {
        setWarningMsg(result.duplicateWarning);
      }

      setSuccessMsg('Asset submitted successfully to Firestore! It will appear on the map.');

      setTimeout(() => {
        onSuccess(result.id);
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMsg(err.message || 'Failed to submit community asset. Please verify input.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="add-asset-modal"
        className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              <span>Contribute Community Resource</span>
            </h3>
            <p className="text-xs text-slate-500">
              Submit a public facility, water plant, clinic, or municipal service to the civic map.
            </p>
          </div>
          <button
            id="close-add-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Submission Error</div>
                <div className="text-[11px]">{errorMsg}</div>
              </div>
            </div>
          )}

          {warningMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">{warningMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-semibold text-xs">{successMsg}</div>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Basic Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resource / Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-asset-name"
                  type="text"
                  required
                  placeholder="e.g. Community Health Center"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Civic Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-asset-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Description & Services <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="input-asset-description"
                  required
                  rows={3}
                  placeholder="Describe public services offered, emergency capabilities, eligibility, or fee structure..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Precise Geographic Location */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Geographic Coordinates & Address</span>
              </h4>
              <button
                type="button"
                onClick={handleUseCurrentGPS}
                className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 text-[11px]"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Autofill GPS Position</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Street Address / Area <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-asset-address"
                  type="text"
                  required
                  placeholder="e.g. Main Road, Beside Panchayat Office, Narsapur"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Prominent Landmark
                </label>
                <input
                  id="input-asset-landmark"
                  type="text"
                  placeholder="e.g. Opposite Water Tank"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  City / Town <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-asset-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Latitude <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-asset-lat"
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Longitude <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-asset-lng"
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Operating Hours & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                id="input-contact-phone"
                type="tel"
                placeholder="e.g. +91 8814 275000"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operating Hours</label>
              <input
                id="input-operating-hours"
                type="text"
                placeholder="e.g. Mon-Sat 9 AM - 5 PM"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Website</label>
              <input
                id="input-website"
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          {/* Section 4: Image Upload (Firebase Storage) */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Facility Images (Firebase Storage)</span>
            </h4>

            <div className="space-y-3">
              {/* File upload drag/click box */}
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="asset-image-file-input"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                <label 
                  htmlFor="asset-image-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-slate-700 text-xs">
                    {uploadingImage ? 'Uploading to Firebase Storage...' : 'Click to Upload Image from Device'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports JPEG, PNG, WebP up to 5 MB
                  </span>
                </label>

                {uploadingImage && (
                  <div className="mt-3 max-w-xs mx-auto">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-semibold">
                      <span>Uploading to Firebase Storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-1.5 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Or manual URL */}
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Or enter direct image URL (https://...)"
                  value={manualImageUrl}
                  onChange={(e) => setManualImageUrl(e.target.value)}
                  className="flex-1 text-xs border border-slate-300 rounded-lg p-2"
                />
                <button
                  type="button"
                  onClick={handleAddManualUrl}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors shrink-0"
                >
                  Add URL
                </button>
              </div>

              {/* Image Previews */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                      <img 
                        src={img} 
                        alt={`Facility photo ${idx + 1}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-md opacity-90 hover:opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Accessibility & Facilities */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              4. Accessibility & Amenities
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACCESSIBILITY_FEATURES.map((feat) => {
                const checked = selectedAccessibility.includes(feat);
                return (
                  <label
                    key={feat}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] font-medium transition-all ${
                      checked
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAccessibility(feat)}
                      className="hidden"
                    />
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {checked && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="truncate">{feat}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
            <button
              id="cancel-add-asset-btn"
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-asset-form-btn"
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Submit to Community Map</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
