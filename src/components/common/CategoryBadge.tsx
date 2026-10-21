import React from 'react';
import { 
  HeartPulse, 
  GraduationCap, 
  Droplets, 
  Building2, 
  Users, 
  ShieldCheck, 
  HandHeart, 
  Trees, 
  Flame, 
  Bus, 
  Zap, 
  MapPin 
} from 'lucide-react';
import { ASSET_CATEGORIES } from '../../constants/categories';

export const CategoryIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className = 'w-4 h-4' }) => {
  switch (iconName) {
    case 'HeartPulse': return <HeartPulse className={className} />;
    case 'GraduationCap': return <GraduationCap className={className} />;
    case 'Droplets': return <Droplets className={className} />;
    case 'Building2': return <Building2 className={className} />;
    case 'Users': return <Users className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'HandHeart': return <HandHeart className={className} />;
    case 'Trees': return <Trees className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'Bus': return <Bus className={className} />;
    case 'Zap': return <Zap className={className} />;
    default: return <MapPin className={className} />;
  }
};

export const CategoryBadge: React.FC<{ categoryId: string; className?: string; size?: 'sm' | 'md' }> = ({ 
  categoryId, 
  className = '',
  size = 'md'
}) => {
  const category = ASSET_CATEGORIES.find(c => c.id === categoryId) || ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px] gap-1' 
    : 'px-2.5 py-0.5 text-xs gap-1.5';

  return (
    <span 
      className={`inline-flex items-center font-medium rounded-md border whitespace-nowrap transition-colors ${sizeClasses} ${className}`}
      style={{ 
        backgroundColor: category.bgLight, 
        color: category.color, 
        borderColor: `${category.color}25` 
      }}
    >
      <CategoryIcon iconName={category.iconName} className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="leading-none">{category.name}</span>
    </span>
  );
};
