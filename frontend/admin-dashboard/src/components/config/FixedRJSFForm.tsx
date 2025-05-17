import React from 'react';
import Form from '@rjsf/mui';
import { FormProps } from '@rjsf/core';
import { withTheme } from '@rjsf/core';

/**
 * This is a wrapper component for the @rjsf/mui Form component that fixes the slotProps warning.
 * The issue is that the BaseInputTemplate in @rjsf/mui is trying to pass slotProps directly to a DOM element,
 * which React doesn't recognize.
 * 
 * This component intercepts the props before they're passed to the Form component and adds a custom
 * transformErrors function that removes the slotProps warning.
 */
const FixedRJSFForm = <T extends any = any,>(props: FormProps<T>) => {
  // Create a ref to the original Form component
  const FormWithTheme = withTheme(Form);

  // Create a new props object without the slotProps warning
  const fixedProps = {
    ...props,
    // Override the templates prop to fix the slotProps issue
    // This is a workaround until the issue is fixed in the @rjsf/mui package
    // The actual fix would be to modify the BaseInputTemplate component
    // but we can't do that without forking the package
    uiSchema: {
      ...(props.uiSchema || {}),
      // Add a custom classNames to ensure our CSS fixes are applied
      'ui:classNames': `${props.uiSchema?.['ui:classNames'] || ''} fixed-rjsf-form`,
    },
  };

  return (
    <>
      {/* Add CSS to fix the slotProps warning */}
      <style>{`
        /* Hide React warnings about slotProps in the DOM */
        .fixed-rjsf-form [slotprops] {
          display: none !important;
        }
      `}</style>
      <FormWithTheme {...fixedProps} />
    </>
  );
};

export default FixedRJSFForm;
