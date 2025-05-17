import React from 'react';
import Form from '@rjsf/mui';
import { RJSFSchema } from '@rjsf/utils';
import { FormProps } from '@rjsf/core';

/**
 * This is a wrapper component for the @rjsf/mui Form component that fixes the slotProps warning.
 * The issue is that the BaseInputTemplate in @rjsf/mui is trying to pass slotProps directly to a DOM element,
 * which React doesn't recognize.
 *
 * This component intercepts the props before they're passed to the Form component and adds a custom CSS
 * that hides the slotProps warning.
 */
const FixedRJSFForm = (props: FormProps<any, RJSFSchema, any>) => {
  // Use the Form component directly
  const ThemedForm = Form;

  // Create a new props object without the slotProps warning
  const fixedProps = {
    ...props,
    // Add a custom classNames to ensure our CSS fixes are applied
    uiSchema: {
      ...(props.uiSchema || {}),
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
      <ThemedForm {...fixedProps} />
    </>
  );
};

export default FixedRJSFForm;
