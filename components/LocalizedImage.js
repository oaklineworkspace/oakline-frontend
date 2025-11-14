
import { useLanguage } from '../contexts/LanguageContext';
import Image from 'next/image';

export default function LocalizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className,
  style,
  priority = false,
  langSpecific = {} // { ig: '/images/ig/logo.png', es: '/images/es/logo.png' }
}) {
  const { language } = useLanguage();
  
  // Use language-specific image if available, otherwise use default
  const imageSrc = langSpecific[language] || src;
  
  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      priority={priority}
    />
  );
}
