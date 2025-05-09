import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  Divider,
  Tooltip,
  IconButton,
  Alert,
  Button,
  Stack,
  Card,
  CardContent,
  FormHelperText,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { JSONSchema7 } from 'json-schema';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { IChangeEvent } from '@rjsf/core';
import { FieldTemplateProps } from '@rjsf/utils';
import customWidgets from '../widgets';

// Custom field template with enhanced visual hierarchy
const CustomFieldTemplate = (props: FieldTemplateProps) => {
  const {
    id,
    label,
    help,
    required,
    description,
    errors,
    children,
  } = props;
  const theme = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  // Don't render anything for hidden fields
  if (props.hidden) {
    return <>{children}</>;
  }

  // Toggle help text visibility
  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  return (
    <Box
      sx={{
        mb: 3,
        width: '100%',
        position: 'relative',
        '&:hover': {
          '& .field-help-icon': {
            opacity: help && help !== description ? 1 : 0.5,
          }
        }
      }}
    >
      {/* Field label with improved styling */}
      {label && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            justifyContent: 'space-between'
          }}
        >
          <Typography
            component="label"
            htmlFor={id}
            variant="subtitle2"
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontWeight: required ? 600 : 500,
              color: theme.palette.text.primary,
              fontSize: '0.875rem',
            }}
          >
            {label}
            {required && (
              <Box component="span" sx={{ color: theme.palette.error.main, ml: 0.5 }}>*</Box>
            )}
          </Typography>

          {/* Help icon for additional information - only show when help text is available and meaningful */}
          {help && help !== description && typeof help === 'string' && help.trim() !== "" && (
            <Tooltip title={help}>
              <IconButton
                size="small"
                onClick={toggleHelp}
                className="field-help-icon"
                sx={{
                  padding: 0.5,
                  opacity: 0.5,
                  transition: 'opacity 0.2s',
                  '&:hover': { opacity: 1 }
                }}
              >
                <HelpIcon fontSize="small" color="action" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Field description with improved styling */}
      {description && (
        <Typography
          variant="body2"
          sx={{
            mb: 1.5,
            color: theme.palette.text.secondary,
            fontSize: '0.8125rem',
            lineHeight: 1.4,
          }}
        >
          {description}
        </Typography>
      )}

      {/* Expandable help text - only show when help text is available and meaningful */}
      {help && help !== description && typeof help === 'string' && help.trim() !== "" && showHelp && (
        <Box
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: 1,
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.03)',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.info.main,
              fontSize: '0.8125rem',
              fontStyle: 'italic',
            }}
          >
            {help}
          </Typography>
        </Box>
      )}

      {/* Input field with enhanced styling */}
      <Box
        sx={{
          width: '100%',
          '& .MuiFormControl-root': {
            width: '100%'
          },
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: theme.palette.primary.main,
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
            }
          },
          // Hide warning icons in the input fields
          '& .MuiInputAdornment-root': {
            display: 'none'
          },
          // Hide any SVG icons that might be warning icons
          '& svg:not(.field-help-icon svg)': {
            display: 'none'
          }
        }}
      >
        {/* Wrap children in a div to apply styles */}
        <div className="form-field-wrapper">
          {children}
        </div>
      </Box>

      {/* Error messages with improved styling */}
      {errors && (
        <FormHelperText
          error
          sx={{
            mt: 0.75,
            fontSize: '0.75rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {errors}
        </FormHelperText>
      )}
    </Box>
  );
};

interface EnhancedConfigFormProps {
  schema: JSONSchema7;
  uiSchema?: any;
  formData: any;
  onChange: (data: { formData: any }) => void;
  disabled?: boolean;
  /**
   * If true, the form will be in wizard mode with next/previous buttons
   * If not provided, wizard mode will be enabled when disabled is false
   */
  wizardMode?: boolean;
  /**
   * Optional callback for when the deploy button is clicked in the completion step
   */
  onDeploy?: () => void;
  /**
   * Optional deployment settings component to be shown as the last step in wizard mode
   */
  deploymentSettingsComponent?: React.ReactNode;
  /**
   * Whether the form is currently in a deploying state
   */
  isDeploying?: boolean;
  /**
   * Optional callback for when a section-specific edit button is clicked
   */
  onSectionEdit?: (sectionKey: string) => void;
  /**
   * Optional callback for when a section-specific save button is clicked
   */
  onSectionSave?: (sectionKey: string) => void;
  /**
   * Optional array of section keys that are currently being edited
   */
  editingSections?: string[];
}

// Add global styles for form fields with enhanced styling
const formStyles = `
  /* Full width form controls */
  .full-width-form-fields .MuiFormControl-root {
    width: 100% !important;
  }
  .full-width-form-fields .MuiTextField-root {
    width: 100% !important;
  }
  .full-width-form-fields .MuiOutlinedInput-root {
    width: 100% !important;
  }

  /* Enhanced input styling */
  .full-width-form-fields .MuiOutlinedInput-root {
    border-radius: 0.25rem !important; /* Match app's default border radius */
    transition: all 0.2s ease-in-out !important;
  }

  .full-width-form-fields .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
    border-color: #0F62FE !important;
  }

  .full-width-form-fields .MuiOutlinedInput-root.Mui-focused {
    box-shadow: 0 0 0 3px rgba(15, 98, 254, 0.15) !important;
  }

  /* Improved select styling */
  .full-width-form-fields .MuiSelect-select {
    padding: 12px 14px !important;
  }

  /* Improved checkbox and radio styling */
  .full-width-form-fields .MuiCheckbox-root,
  .full-width-form-fields .MuiRadio-root {
    padding: 6px !important;
  }

  /* Improved spacing between form elements */
  .full-width-form-fields .MuiFormControl-root + .MuiFormControl-root {
    margin-top: 16px !important;
  }

  /* Improved textarea styling */
  .full-width-form-fields textarea.MuiOutlinedInput-input {
    padding: 12px 14px !important;
    min-height: 80px !important;
  }

  /* Improved label styling */
  .full-width-form-fields .MuiFormLabel-root {
    font-weight: 500 !important;
    font-size: 0.875rem !important;
  }

  /* Improved helper text styling */
  .full-width-form-fields .MuiFormHelperText-root {
    margin-top: 4px !important;
    font-size: 0.75rem !important;
    line-height: 1.4 !important;
  }

  /* Fix for warning icons in form fields */
  .MuiFormControl-root .MuiFormLabel-asterisk,
  .MuiFormControl-root .MuiInputLabel-asterisk {
    display: none !important;
  }

  /* Hide any warning icons that might be added by the form library */
  .MuiFormControl-root svg[data-testid="WarningIcon"],
  .MuiFormControl-root svg[data-testid="ErrorIcon"],
  .MuiFormControl-root svg[data-testid="ReportProblemOutlinedIcon"],
  .MuiFormControl-root svg[data-testid="ReportProblemIcon"],
  .MuiFormControl-root svg.MuiSvgIcon-fontSizeSmall[focusable="false"],
  .quick-actions svg.MuiSvgIcon-root,
  .MuiFormControl-root .MuiInputAdornment-root svg,
  /* Target specific warning icons in the form fields */
  .MuiFormLabel-root + .MuiInputBase-root .MuiInputAdornment-root svg,
  .MuiFormLabel-root + .MuiInputBase-root svg,
  /* Target all warning icons in the form */
  .MuiFormControl-root .MuiSvgIcon-root[focusable="false"]:not(.field-help-icon .MuiSvgIcon-root),
  /* Target the specific warning icons in the quick actions section */
  .quick-actions .MuiFormControl-root .MuiSvgIcon-root,
  /* Target all warning icons in the form with a more specific selector */
  div[id^="root_quick_actions_quick_action"] .MuiSvgIcon-root {
    display: none !important;
  }

  /* Remove yellow background from autofilled inputs */
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px white inset !important;
    -webkit-text-fill-color: inherit !important;
  }

  /* Dark mode autofill */
  @media (prefers-color-scheme: dark) {
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px #1e1e1e inset !important;
      -webkit-text-fill-color: #ffffff !important;
    }
  }
`;

const EnhancedConfigForm: React.FC<EnhancedConfigFormProps> = ({
  schema,
  uiSchema,
  formData,
  onChange,
  disabled = false,
  wizardMode,
  onDeploy,
  deploymentSettingsComponent,
  isDeploying = false,
  onSectionEdit,
  onSectionSave,
  editingSections = [],
}) => {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);

  // Determine if we should use wizard mode
  // Only use wizard mode if explicitly set to true
  const isWizardMode = wizardMode === true;

  // Get the app slug from the URL to use as part of the localStorage key
  const getAppSlugFromUrl = (): string | null => {
    const path = window.location.pathname;
    // Check for deploy-app path
    const deployMatch = path.match(/\/deploy-app\/([^/]+)/);
    if (deployMatch) return deployMatch[1];

    // Check for my-apps path
    const appMatch = path.match(/\/my-apps\/([^/]+)/);
    if (appMatch) return appMatch[1];

    return null;
  };

  // State to track the currently active section
  const [activeSection, setActiveSection] = useState<number>(() => {
    const appSlug = getAppSlugFromUrl();
    if (appSlug) {
      const savedSection = localStorage.getItem(`rag_app_${appSlug}_active_section`);
      return savedSection ? parseInt(savedSection, 10) : 0;
    }
    return 0;
  });

  // State to track if we're in the completion step (after all sections)
  const [showCompletion, setShowCompletion] = useState<boolean>(() => {
    const appSlug = getAppSlugFromUrl();
    if (appSlug) {
      return localStorage.getItem(`rag_app_${appSlug}_show_completion`) === 'true';
    }
    return false;
  });

  // State to track if we're in the deployment settings step (before completion)
  const [showDeploymentSettings, setShowDeploymentSettings] = useState<boolean>(() => {
    const appSlug = getAppSlugFromUrl();
    if (appSlug) {
      return localStorage.getItem(`rag_app_${appSlug}_show_deployment`) === 'true';
    }
    return false;
  });

  // Refs for each accordion
  const accordionRefs = useRef<(HTMLElement | null)[]>([]);

  // Validate schema on mount
  useEffect(() => {
    try {
      console.log('Validating schema:', schema);
      if (!schema || typeof schema !== 'object') {
        throw new Error('Invalid schema: Schema must be a valid JSON object');
      }

      if (!schema.properties || typeof schema.properties !== 'object') {
        throw new Error('Invalid schema: Schema must have properties object');
      }

      // Log UI schema for debugging
      console.log('Using UI schema:', uiSchema);

      // Check if documents section is disabled
      if (uiSchema && uiSchema.documents) {
        console.log('Documents section UI schema:', uiSchema.documents);
        console.log('Documents section disabled:', uiSchema.documents['ui:disabled']);

        if (uiSchema.documents.file_upload) {
          console.log('File upload widget disabled:', uiSchema.documents.file_upload['ui:disabled']);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Schema validation error:', err);
      setError((err as Error).message || 'Invalid schema configuration');
    }
  }, [schema, uiSchema]);

  // Group schema properties into sections for better organization
  const getSections = () => {
    if (!schema.properties) return [];

    return Object.entries(schema.properties).map(([key, value]) => {
      if (typeof value === 'object' && value.type === 'object' && value.properties) {
        // This is a section with nested properties
        return {
          key,
          title: value.title || key,
          description: value.description,
          isObject: true,
          properties: value.properties,
        };
      }

      // This is a top-level property
      return {
        key,
        title: (value as any).title || key,
        description: (value as any).description,
        isObject: false,
      };
    });
  };

  const sections = getSections();

  // Create a custom UI schema for each section
  const getCustomUiSchema = (sectionKey: string) => {
    const baseUiSchema = {
      'ui:submitButtonOptions': {
        norender: true,
      },
      // Add global styles to ensure all form controls have 100% width
      'ui:classNames': 'full-width-form-fields',
    };

    // If there's a UI schema for this section in the provided uiSchema, use it
    if (uiSchema && uiSchema[sectionKey]) {
      return {
        ...baseUiSchema,
        ...uiSchema[sectionKey],
      };
    }

    return baseUiSchema;
  };

  // Handle form change for a specific section
  const handleSectionChange = (sectionKey: string, data: IChangeEvent<any>) => {
    if (data.formData) {
      const newFormData = {
        ...formData,
        [sectionKey]: data.formData,
      };
      onChange({ formData: newFormData });
    }
  };

  // Initialize accordion refs when sections change
  useEffect(() => {
    accordionRefs.current = accordionRefs.current.slice(0, sections.length);
  }, [sections]);

  // Handle navigation to the next section
  const handleNext = () => {
    if (activeSection < sections.length - 1) {
      // Close current accordion
      const currentAccordion = accordionRefs.current[activeSection];
      if (currentAccordion) {
        const summary = currentAccordion.querySelector('.MuiAccordionSummary-root');
        if (summary && !summary.classList.contains('Mui-expanded')) {
          (summary as HTMLElement & { click(): void }).click();
        }
      }

      // Open next accordion
      const nextAccordion = accordionRefs.current[activeSection + 1];
      if (nextAccordion) {
        const summary = nextAccordion.querySelector('.MuiAccordionSummary-root');
        if (summary && summary.classList.contains('Mui-expanded')) {
          (summary as HTMLElement & { click(): void }).click();
        }
      }

      const newActiveSection = activeSection + 1;
      setActiveSection(newActiveSection);
      setShowCompletion(false);
      setShowDeploymentSettings(false);

      // Save the active section to localStorage
      const appSlug = getAppSlugFromUrl();
      if (appSlug) {
        localStorage.setItem(`rag_app_${appSlug}_active_section`, newActiveSection.toString());
      }
    } else if (activeSection === sections.length - 1) {
      // We're at the last section, move to deployment settings if available
      if (deploymentSettingsComponent) {
        setShowDeploymentSettings(true);
        setShowCompletion(false);

        // Save the state to localStorage
        const appSlug = getAppSlugFromUrl();
        if (appSlug) {
          localStorage.setItem(`rag_app_${appSlug}_show_deployment`, 'true');
          localStorage.setItem(`rag_app_${appSlug}_show_completion`, 'false');
        }
      } else {
        // No deployment settings, go straight to completion
        setShowCompletion(true);
        setShowDeploymentSettings(false);

        // Save the state to localStorage
        const appSlug = getAppSlugFromUrl();
        if (appSlug) {
          localStorage.setItem(`rag_app_${appSlug}_show_deployment`, 'false');
          localStorage.setItem(`rag_app_${appSlug}_show_completion`, 'true');
        }
      }
    }
  };

  // Handle navigation to the previous section
  const handlePrevious = () => {
    if (showCompletion) {
      // If we're in the completion step, go back to deployment settings if available
      if (deploymentSettingsComponent) {
        setShowDeploymentSettings(true);
        setShowCompletion(false);

        // Save the state to localStorage
        const appSlug = getAppSlugFromUrl();
        if (appSlug) {
          localStorage.setItem(`rag_app_${appSlug}_show_deployment`, 'true');
          localStorage.setItem(`rag_app_${appSlug}_show_completion`, 'false');
        }
      } else {
        // No deployment settings, go back to the last section
        setShowCompletion(false);

        // Save the state to localStorage
        const appSlug = getAppSlugFromUrl();
        if (appSlug) {
          localStorage.setItem(`rag_app_${appSlug}_show_completion`, 'false');
        }
      }
      return;
    }

    if (showDeploymentSettings) {
      // If we're in the deployment settings step, go back to the last section
      setShowDeploymentSettings(false);

      // Save the state to localStorage
      const appSlug = getAppSlugFromUrl();
      if (appSlug) {
        localStorage.setItem(`rag_app_${appSlug}_show_deployment`, 'false');
      }
      return;
    }

    if (activeSection > 0) {
      // Close current accordion
      const currentAccordion = accordionRefs.current[activeSection];
      if (currentAccordion) {
        const summary = currentAccordion.querySelector('.MuiAccordionSummary-root');
        if (summary && !summary.classList.contains('Mui-expanded')) {
          (summary as HTMLElement & { click(): void }).click();
        }
      }

      // Open previous accordion
      const prevAccordion = accordionRefs.current[activeSection - 1];
      if (prevAccordion) {
        const summary = prevAccordion.querySelector('.MuiAccordionSummary-root');
        if (summary && summary.classList.contains('Mui-expanded')) {
          (summary as HTMLElement & { click(): void }).click();
        }
      }

      const newActiveSection = activeSection - 1;
      setActiveSection(newActiveSection);

      // Save the active section to localStorage
      const appSlug = getAppSlugFromUrl();
      if (appSlug) {
        localStorage.setItem(`rag_app_${appSlug}_active_section`, newActiveSection.toString());
      }
    }
  };

  // Render the deployment settings step with enhanced styling
  const renderDeploymentSettingsStep = () => {
    return (
      <Card
        sx={{
          mb: 3,
          border: `1px solid ${theme.palette.primary.main}`,
          borderRadius: '0.375rem !important', // Match app's card border radius
          boxShadow: theme.palette.mode === 'dark'
            ? '0 1px 2px 0 rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.06)'
            : '0 1px 2px 0 rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: theme.palette.mode === 'dark'
              ? '0 6px 10px -3px rgba(0,0,0,0.1), 0 3px 4px -2px rgba(0,0,0,0.05)'
              : '0 6px 10px -3px rgba(0,0,0,0.1), 0 3px 4px -2px rgba(0,0,0,0.05)',
          }
        }}
      >
        <Box
          sx={{
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(25, 118, 210, 0.15)'
              : 'rgba(25, 118, 210, 0.05)',
            borderBottom: `1px solid ${theme.palette.primary.main}`,
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <SettingsIcon
            color="primary"
            sx={{
              fontSize: 28,
              mr: 2,
              p: 0.5,
              borderRadius: '50%',
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(25, 118, 210, 0.2)'
                : 'rgba(25, 118, 210, 0.1)',
            }}
          />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: theme.palette.primary.main
            }}
          >
            Deployment Settings
          </Typography>
        </Box>
        <CardContent sx={{ p: 4 }}>
          {deploymentSettingsComponent}
        </CardContent>
      </Card>
    );
  };

  // Render the completion step with enhanced styling
  const renderCompletionStep = () => {
    return (
      <Card
        sx={{
          mb: 3,
          border: `1px solid ${isDeploying ? theme.palette.primary.main : theme.palette.success.main}`,
          borderRadius: '0.375rem !important', // Match app's card border radius
          boxShadow: theme.palette.mode === 'dark'
            ? '0 1px 2px 0 rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.06)'
            : '0 1px 2px 0 rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: theme.palette.mode === 'dark'
              ? '0 6px 10px -3px rgba(0,0,0,0.1), 0 3px 4px -2px rgba(0,0,0,0.05)'
              : '0 6px 10px -3px rgba(0,0,0,0.1), 0 3px 4px -2px rgba(0,0,0,0.05)',
          }
        }}
      >
        <CardContent sx={{ p: 5, textAlign: 'center' }}>
          {isDeploying ? (
            <>
              <Box
                sx={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  margin: '0 auto 24px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress
                  color="primary"
                  size={80}
                  thickness={3}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 0 0 4px rgba(0, 0, 0, 0.2)'
                      : '0 0 0 4px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <SettingsIcon
                    color="primary"
                    sx={{
                      fontSize: 32,
                      animation: 'spin 2s linear infinite',
                      '@keyframes spin': {
                        '0%': {
                          transform: 'rotate(0deg)',
                        },
                        '100%': {
                          transform: 'rotate(360deg)',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  mb: 2,
                  color: theme.palette.primary.main
                }}
              >
                Deploying Your App...
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                paragraph
                sx={{
                  maxWidth: 500,
                  mx: 'auto',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                }}
              >
                Please wait while we deploy your RAG chatbot. This may take a few moments while we process your documents and set up your application.
              </Typography>
            </>
          ) : (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  margin: '0 auto 24px auto',
                  borderRadius: '50%',
                  backgroundColor: `${theme.palette.success.main}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 0 8px ${theme.palette.success.main}10`,
                }}
              >
                <CheckCircleIcon
                  color="success"
                  sx={{
                    fontSize: 48,
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                  }}
                />
              </Box>
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  mb: 2,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(45deg, #4caf50 30%, #8bc34a 90%)'
                    : 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Ready to Launch!
              </Typography>
              <Typography
                variant="body1"
                paragraph
                sx={{
                  maxWidth: 500,
                  mx: 'auto',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  mb: 3,
                }}
              >
                You have successfully configured your RAG chatbot. Click the "Deploy App" button below to launch your app!
              </Typography>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '0.375rem', // Match app's card border radius
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  border: `1px solid ${theme.palette.divider}`,
                  maxWidth: 500,
                  mx: 'auto',
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                  }}
                >
                  <InfoIcon sx={{ fontSize: 18, mr: 1, color: theme.palette.info.main }} />
                  You can always change configuration and files in the app settings after deployment.
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Determine if we should show the navigation buttons
  const showNavigation = isWizardMode;

  // Determine if we're on the last step (for the "Finish" button)
  const isLastStep = activeSection === sections.length - 1;

  // Determine if we're on the first step (to disable the "Previous" button)
  const isFirstStep = activeSection === 0;

  // Determine the next button action and text
  const getNextButtonAction = () => {
    if (showCompletion) {
      return onDeploy;
    } else if (showDeploymentSettings) {
      // When clicking "Launch App" from deployment settings, go directly to deploy
      return onDeploy || (() => {
        setShowDeploymentSettings(false);
        setShowCompletion(true);
      });
    } else if (isLastStep) {
      return () => {
        if (deploymentSettingsComponent) {
          setShowDeploymentSettings(true);
        } else {
          setShowCompletion(true);
        }
      };
    } else {
      return handleNext;
    }
  };

  // Determine the next button text
  const getNextButtonText = () => {
    if (showCompletion) {
      return isDeploying ? 'Deploying...' : 'Deploy App';
    } else if (showDeploymentSettings) {
      return 'Launch App';
    } else if (isLastStep) {
      return 'Next';
    } else {
      return 'Next';
    }
  };

  // Determine if the next button should be disabled
  const isNextButtonDisabled = () => {
    return showCompletion && isDeploying;
  };

  // Determine the next button color
  const getNextButtonColor = () => {
    return showCompletion ? 'success' : 'primary';
  };

  // Determine the next button icon
  const getNextButtonIcon = () => {
    if (showCompletion) {
      return <CheckCircleOutlineIcon />;
    } else {
      return <NavigateNextIcon />;
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Add global styles */}
      <style>{formStyles}</style>
      <Box sx={{ flexGrow: 1 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : sections.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No configuration options available for this template.
          </Alert>
        ) : isWizardMode && showCompletion ? (
          // Show completion step in wizard mode when all sections are completed
          renderCompletionStep()
        ) : isWizardMode && showDeploymentSettings && deploymentSettingsComponent ? (
          // Show deployment settings step in wizard mode
          renderDeploymentSettingsStep()
        ) : (
          // Show sections (all in edit mode, only active one in wizard mode)
          sections.map((section, index) => {
            // In wizard mode, only render the active section
            if (isWizardMode && index !== activeSection) {
              return null;
            }

            return (
              <Accordion
                key={section.key}
                ref={(el) => (accordionRefs.current[index] = el)}
                defaultExpanded={isWizardMode ? true : false} // Default to closed in view mode, open in wizard mode
                expanded={isWizardMode ? true : undefined} // Always expanded in wizard mode, controlled by user in view mode
                sx={{
                  mb: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '0.375rem !important', // Match app's card border radius
                  '&:before': {
                    display: 'none',
                  },
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 1px 2px 0 rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.06)'
                    : '0 1px 2px 0 rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.3s ease, transform 0.2s ease',
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 6px 10px -3px rgba(0,0,0,0.1), 0 3px 4px -2px rgba(0,0,0,0.05)'
                      : '0 6px 10px -3px rgba(0,0,0,0.1), 0 3px 4px -2px rgba(0,0,0,0.05)',
                  },
                  '&.Mui-expanded': {
                    transform: 'translateY(-1px)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 3px 5px -1px rgba(0,0,0,0.1), 0 1px 3px -1px rgba(0,0,0,0.05)'
                      : '0 3px 5px -1px rgba(0,0,0,0.1), 0 1px 3px -1px rgba(0,0,0,0.05)',
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={!isWizardMode ? <ExpandMoreIcon /> : null} // Show expand icon in non-wizard mode
                  aria-controls={`${section.key}-content`}
                  id={`${section.key}-header`}
                  sx={{
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.07)'
                      : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: '0.375rem 0.375rem 0 0', // Match app's card border radius
                    padding: '12px 16px',
                    // Only disable click in wizard mode
                    pointerEvents: isWizardMode ? 'none' : 'auto',
                    '&.Mui-expanded': {
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.09)'
                        : 'rgba(0, 0, 0, 0.03)',
                    },
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {/* Section number indicator */}
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: isWizardMode
                            ? theme.palette.primary.main
                            : theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.06)',
                          color: isWizardMode
                            ? theme.palette.primary.contrastText
                            : theme.palette.text.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          mr: 2,
                        }}
                      >
                        {index + 1}
                      </Box>

                      <Box>
                        <Typography
                          variant="subtitle1"
                          fontWeight={600}
                          sx={{
                            color: theme.palette.mode === 'dark'
                              ? theme.palette.primary.light
                              : theme.palette.primary.dark
                          }}
                        >
                          {section.title}
                        </Typography>

                        {/* Show description as subtitle in the header - only when description is available and meaningful */}
                        {section.description && typeof section.description === 'string' && section.description.trim() !== "" && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: theme.palette.text.secondary,
                              fontSize: '0.8125rem',
                              mt: 0.5,
                              display: { xs: 'none', sm: 'block' }
                            }}
                          >
                            {section.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Help icon for mobile view - only show when description is available and meaningful */}
                    {!isWizardMode && section.description && typeof section.description === 'string' && section.description.trim() !== "" && (
                      <Box
                        sx={{
                          ml: 'auto',
                          display: { xs: 'flex', sm: 'none' }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip title={section.description}>
                          <IconButton
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <HelpIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Box sx={{ p: 3 }}>
                    {/* Edit/Save button inside the accordion content */}
                    {!isWizardMode && onSectionEdit && (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          mb: 2,
                        }}
                      >
                        {editingSections.includes(section.key) ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<SaveIcon />}
                            onClick={() => {
                              // Call the section save handler without closing the accordion
                              onSectionSave && onSectionSave(section.key);
                            }}
                            sx={{
                              borderRadius: '0.25rem',
                              px: 1.5,
                              boxShadow: 'none',
                              '&:hover': {
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                              }
                            }}
                          >
                            Save Changes
                          </Button>
                        ) : (
                          // Only show Edit button if this is NOT the Knowledge Base section (documents)
                          section.key !== 'documents' && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => {
                                // Call the section edit handler
                                onSectionEdit(section.key);
                              }}
                              disabled={false}
                              sx={{
                                borderRadius: '0.25rem',
                                px: 1.5,
                                borderColor: theme.palette.primary.main,
                                color: theme.palette.primary.main,
                                '&:hover': {
                                  backgroundColor: `${theme.palette.primary.main}10`,
                                }
                              }}
                            >
                              Edit Section
                            </Button>
                          )
                        )}
                      </Box>
                    )}

                    {(() => {
                      try {
                        if (section.isObject) {
                          // For object sections, create a form for the nested properties
                          return (
                            <Form
                              schema={{
                                type: 'object',
                                properties: section.properties,
                              } as JSONSchema7}
                              formData={formData[section.key] || {}}
                              onChange={(data: IChangeEvent<any>) => handleSectionChange(section.key, data)}
                              validator={validator}
                              disabled={disabled || (!isWizardMode && !editingSections.includes(section.key))}
                              uiSchema={getCustomUiSchema(section.key)}
                              widgets={{
                                fileUpload: customWidgets.fileUpload,
                              }}
                              templates={{ FieldTemplate: CustomFieldTemplate }}
                            />
                          );
                        } else {
                          // For top-level properties, create a form with just that property
                          return (
                            <Form
                              schema={{
                                type: 'object',
                                properties: {
                                  [section.key]: schema.properties?.[section.key],
                                },
                              } as JSONSchema7}
                              formData={{ [section.key]: formData[section.key] }}
                              onChange={(data: IChangeEvent<any>) => {
                                if (data.formData) {
                                  const newFormData = {
                                    ...formData,
                                    [section.key]: data.formData[section.key],
                                  };
                                  onChange({ formData: newFormData });
                                }
                              }}
                              validator={validator}
                              disabled={disabled || (!isWizardMode && !editingSections.includes(section.key))}
                              uiSchema={getCustomUiSchema(section.key)}
                              widgets={{
                                fileUpload: customWidgets.fileUpload,
                              }}
                              templates={{ FieldTemplate: CustomFieldTemplate }}
                            />
                          );
                        }
                      } catch (err) {
                        console.error(`Error rendering form for section ${section.key}:`, err);
                        return (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            Error rendering form for section "{section.title}": {(err as Error).message}
                          </Alert>
                        );
                      }
                    })()}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>

      {/* Enhanced navigation bar */}
      {showNavigation && (
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mt: 3,
            borderTop: `1px solid ${theme.palette.divider}`,
            borderRadius: '0 0 0.375rem 0.375rem', // Match app's card border radius
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 -1px 2px 0 rgba(0,0,0,0.1), 0 -1px 1px -1px rgba(0,0,0,0.06)'
              : '0 -1px 2px 0 rgba(0,0,0,0.1), 0 -1px 1px -1px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.3s ease',
          }}
        >
          <Stack
            direction="row"
            spacing={3}
            justifyContent="space-between"
            alignItems="center"
          >
            {/* Progress indicator */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  mr: 1.5
                }}
              >
                {showCompletion
                  ? 'Ready to deploy'
                  : showDeploymentSettings
                    ? 'Final settings'
                    : `Step ${activeSection + 1} of ${sections.length}`}
              </Typography>

              {/* Progress dots */}
              {!showCompletion && !showDeploymentSettings && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {sections.map((_, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        mx: 0.5,
                        backgroundColor: idx === activeSection
                          ? theme.palette.primary.main
                          : idx < activeSection
                            ? theme.palette.success.main
                            : theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* Navigation buttons */}
            <Box sx={{ display: 'flex', gap: 2, ml: { xs: 'auto', sm: 0 } }}>
              <Button
                variant="outlined"
                startIcon={<NavigateBeforeIcon />}
                onClick={handlePrevious}
                disabled={isFirstStep && !showDeploymentSettings && !showCompletion}
                sx={{
                  borderRadius: '0.25rem', // Match app's button border radius
                  px: 2,
                  py: 0.75,
                  fontWeight: 500,
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  }
                }}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                color={getNextButtonColor()}
                endIcon={getNextButtonIcon()}
                onClick={getNextButtonAction()}
                disabled={isNextButtonDisabled()}
                sx={{
                  borderRadius: '0.25rem', // Match app's button border radius
                  px: 2,
                  py: 0.75,
                  fontWeight: 500,
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 2px 4px rgba(0, 0, 0, 0.2)'
                      : '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                {getNextButtonText()}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default EnhancedConfigForm;
