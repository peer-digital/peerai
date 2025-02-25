declare module 'swagger-ui-react' {
  import React from 'react';
  
  interface SwaggerUIProps {
    url?: string;
    spec?: object;
    layout?: string;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    displayOperationId?: boolean;
    filter?: boolean | string;
    maxDisplayedTags?: number;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    supportedSubmitMethods?: Array<string>;
    tryItOutEnabled?: boolean;
    validatorUrl?: string | null;
    requestInterceptor?: (req: any) => any;
    responseInterceptor?: (res: any) => any;
    onComplete?: () => void;
    presets?: Array<any>;
    plugins?: Array<any>;
    [key: string]: any;
  }
  
  const SwaggerUI: React.FC<SwaggerUIProps>;
  
  export default SwaggerUI;
} 