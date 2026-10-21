import React, { useState } from 'react';
import { 
  X, 
  Check, 
  AlertCircle, 
  Building, 
  MapPin, 
  ImageIcon, 
  Upload, 
  Trash2, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { ASSET_CATEGORIES, ACCESSIBILITY_FEATURES, COMMON_FACILITIES } from '../../constants/categories';
import { updateAsset } from '../../services/assetService';
import { uploadAssetImage, validateImageFile } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';
import { CommunityAsset } from '../../types';

interface EditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: CommunityAsset;
  onUpdated: () => void;
}

export const EditAssetModal: React.FC<EditAssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  onUpdated
}) => {
  const { currentUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState(asset.name);
  const [categoryId, setCategoryId] = useState(asset.categoryId || asset.category || 'healthcare');
  const [subcategory, setSubcategory] = useState(asset.subcategory || '');
  const [description, setDescription] = useState(asset.description);
  const [address, setAddress] = useState(asset.address);
  const [landmark, setLandmark] = useState(asset.landmark || '');
  const [city, setCity] = useState(asset.city || 'Narsapur');
  const [state, setState] = useState(asset.state || 'Andhra Pradesh');
  const [postalCode, setPostalCode] = useState(asset.postalCode || '');
  const [latitude, setLatitude] = useState(asset.latitude.toString());
  const [longitude, setLongitude] = useState(asset.longitude.toString());
  const [contactNumber, setContactNumber] = useState(asset.contactNumber || asset.phone || '');
  const [email, setEmail] = useState(asset.email || '');
  const [website, setWebsite] = useState(asset.website || '');
  const [operatingHours, setOperatingHours] = useState(asset.operatingHours || asset.openingHours || '');
  const [selectedAccessibility, setSelectedAccessibility] = useState<string[]>(asset.accessibility || []);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(asset.facilities || []);
  const [images, setImages] = useState<string[]>(asset.imageUrls || asset.images || []);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Invalid image file.');
      return;
    }

    setUploadingImage(true);
    setErrorMsg(null);
    try {
      const downloadUrl = await uploadAssetImage(asset.id, file, (prog) => {
        setUploadProgress(prog);
      });
      setImages(prev => [...prev, downloadUrl]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Image upload failed.');
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
      setImages(prev => [...prev, manualImageUrl.trim()]);
      setManualImageUrl('');
    } catch {
      setErrorMsg('Please enter a valid image URL starting with http:// or https://');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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

    if (!currentUser) {
      setErrorMsg('You must be signed in to edit this resource.');
      return;
    }

    setSubmitting(true);
    try {
      const allImages = [...images];
      if (manualImageUrl.trim()) allImages.push(manualImageUrl.trim());

      await updateAsset(
        asset.id,
        {
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
          imageUrls: allImages
        },
        currentUser.uid
      );

      setSuccessMsg('Asset details updated successfully in Firestore!');
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update asset in Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="edit-asset-modal"
        className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Edit Community Resource
            </h3>
            <p className="text-xs text-slate-500">
              Update facility specifications, coordinates, photos, or contact info.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Facility Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Civic Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
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
                Description & Services <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operating Hours</label>
              <input
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block font-semibold text-slate-700">Photos</label>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center">
              <input
                type="file"
                id="edit-asset-image-input"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={uploadingImage}
                className="hidden"
              />
              <label 
                htmlFor="edit-asset-image-input"
                className="cursor-pointer text-emerald-700 hover:text-emerald-800 font-semibold text-xs inline-flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadingImage ? 'Uploading image...' : 'Upload Image to Storage'}</span>
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200">
                    <img src={img} alt="Resource" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold text-xs shadow-xs flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Update in Firestore</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
