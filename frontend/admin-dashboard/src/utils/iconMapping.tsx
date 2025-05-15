import React from 'react';
import {
  Description as DescriptionIcon,
  Search as SearchIcon,
  SmartToy as SmartToyIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Chat as ChatIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Psychology as PsychologyIcon,
  Biotech as BiotechIcon,
  School as SchoolIcon,
  Translate as TranslateIcon,
  Analytics as AnalyticsIcon,
  DataObject as DataObjectIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
  Apps as AppsIcon,
} from '@mui/icons-material';

/**
 * Maps icon type strings to Material-UI icon components
 * @param iconType The icon type string from the template
 * @returns The corresponding Material-UI icon component
 */
export const getIconComponent = (iconType?: string) => {
  if (!iconType) return AppsIcon;

  switch (iconType) {
    case 'Description':
      return DescriptionIcon;
    case 'Search':
      return SearchIcon;
    case 'SmartToy':
      return SmartToyIcon;
    case 'Storage':
      return StorageIcon;
    case 'Code':
      return CodeIcon;
    case 'Chat':
      return ChatIcon;
    case 'QuestionAnswer':
      return QuestionAnswerIcon;
    case 'Psychology':
      return PsychologyIcon;
    case 'Biotech':
      return BiotechIcon;
    case 'School':
      return SchoolIcon;
    case 'Translate':
      return TranslateIcon;
    case 'Analytics':
      return AnalyticsIcon;
    case 'DataObject':
      return DataObjectIcon;
    case 'AutoAwesome':
      return AutoAwesomeIcon;
    case 'Lightbulb':
      return LightbulbIcon;
    default:
      return AppsIcon;
  }
};

/**
 * Renders the appropriate icon component based on the icon type
 * @param iconType The icon type string from the template
 * @param props Additional props to pass to the icon component
 * @returns The rendered icon component
 */
export const renderIcon = (iconType?: string, props?: any) => {
  const IconComponent = getIconComponent(iconType);
  return <IconComponent {...props} />;
};

/**
 * List of available icon types for selection in forms
 */
export const availableIconTypes = [
  'Description',
  'Search',
  'SmartToy',
  'Storage',
  'Code',
  'Chat',
  'QuestionAnswer',
  'Psychology',
  'Biotech',
  'School',
  'Translate',
  'Analytics',
  'DataObject',
  'AutoAwesome',
  'Lightbulb',
  'Apps',
];
