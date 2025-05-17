import { useEffect } from 'react';
import { useBreadcrumbs, BreadcrumbItem } from '../contexts/BreadcrumbContext';

/**
 * Custom hook to update breadcrumbs when a component mounts
 * @param breadcrumbs Array of breadcrumb items to set
 */
export const useBreadcrumbsUpdate = (breadcrumbs: BreadcrumbItem[]) => {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    
    // Clean up breadcrumbs when component unmounts
    return () => {
      setBreadcrumbs([]);
    };
  }, [setBreadcrumbs, JSON.stringify(breadcrumbs)]);
};
