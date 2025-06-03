import React from 'react';
import { sanitizeHtml } from '../../Utils/textUtils';

/**
 * Component for safely displaying rich text HTML content
 * @param {string} content - HTML content to display
 * @param {string} className - Additional CSS classes
 * @param {number} maxHeight - Maximum height in pixels (optional)
 */
const RichTextDisplay = ({ content, className = '', maxHeight = null }) => {
  if (!content) return null;

  const sanitizedContent = sanitizeHtml(content);

  const containerStyle = {
    ...(maxHeight && { 
      maxHeight: `${maxHeight}px`, 
      overflowY: 'auto' 
    })
  };

  return (
    <div 
      className={`rich-text-display text-text-primary ${className}`}
      style={containerStyle}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

export default RichTextDisplay;