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
} from '@mui/icons-material';
import { JSONSchema7 } from 'json-schema';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { IChangeEvent } from '@rjsf/core';
import { FieldTemplateProps } from '@rjsf/utils';
import customWidgets from '../widgets';

// Custom field template that places descriptions above input fields
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

  // Don't render anything for hidden fields
  if (props.hidden) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ mb: 2, width: '100%' }}>
      {label && (
        <Typography
          component="label"
          htmlFor={id}
          sx={{
            display: 'block',
            mb: 0.5,
            fontWeight: required ? 'bold' : 'normal'
          }}
        >
          {label}
          {required ? '*' : ''}
        </Typography>
      )}

      {/* Place description above the input field */}
      {description && (
        <FormHelperText
          sx={{
            mt: 0,
            mb: 1,
            lineHeight: 1.4,
            '&.MuiFormHelperText-root': {
              marginLeft: 0,
              marginRight: 0
            }
          }}
        >
          {description}
        </FormHelperText>
      )}

      {/* Render the actual input field with 100% width */}
      <Box
        sx={{
          width: '100%',
          '& .MuiFormControl-root': {
            width: '100%'
          }
        }}
      >
        {children}
      </Box>

      {/* Show errors below the field */}
      {errors && <FormHelperText error>{errors}</FormHelperText>}

      {/* Show help text below the field if it's different from description */}
      {help && help !== description && (
        <FormHelperText sx={{ mt: 0.5 }}>{help}</FormHelperText>
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

// Add global styles for form fields
const formStyles = `
  .full-width-form-fields .MuiFormControl-root {
    width: 100% !important;
  }
  .full-width-form-fields .MuiTextField-root {
    width: 100% !important;
  }
  .full-width-form-fields .MuiOutlinedInput-root {
    width: 100% !important;
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
          (summary as HTMLElement).click();
        }
      }

      // Open next accordion
      const nextAccordion = accordionRefs.current[activeSection + 1];
      if (nextAccordion) {
        const summary = nextAccordion.querySelector('.MuiAccordionSummary-root');
        if (summary && summary.classList.contains('Mui-expanded')) {
          (summary as HTMLElement).click();
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
          (summary as HTMLElement).click();
        }
      }

      // Open previous accordion
      const prevAccordion = accordionRefs.current[activeSection - 1];
      if (prevAccordion) {
        const summary = prevAccordion.querySelector('.MuiAccordionSummary-root');
        if (summary && summary.classList.contains('Mui-expanded')) {
          (summary as HTMLElement).click();
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

  // Render the deployment settings step
  const renderDeploymentSettingsStep = () => {
    return (
      <Card
        sx={{
          mb: 2,
          border: `1px solid ${theme.palette.primary.main}`,
          borderRadius: '8px !important',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Deployment Settings
          </Typography>

          {deploymentSettingsComponent}
        </CardContent>
      </Card>
    );
  };

  // Render the completion step
  const renderCompletionStep = () => {
    return (
      <Card
        sx={{
          mb: 2,
          border: `1px solid ${theme.palette.success.main}`,
          borderRadius: '8px !important',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {isDeploying ? (
            <>
              <CircularProgress
                color="success"
                sx={{ mb: 2 }}
                size={64}
              />
              <Typography variant="h5" gutterBottom>
                Deploying Your App...
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Please wait while we deploy your RAG chatbot. This may take a few moments.
              </Typography>
            </>
          ) : (
            <>
              <CheckCircleIcon
                color="success"
                sx={{ fontSize: 64, mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                Ready to Launch!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                You have successfully configured your RAG chatbot. Click the "Deploy App" button below to launch your app!
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                You can always change configuration and files in the app settings after deployment.
              </Typography>
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
                  mb: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '8px !important',
                  '&:before': {
                    display: 'none',
                  },
                  boxShadow: 'none',
                }}
              >
                <AccordionSummary
                  expandIcon={null} // No expand icon
                  aria-controls={`${section.key}-content`}
                  id={`${section.key}-header`}
                  sx={{
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.03)',
                    borderRadius: '8px 8px 0 0',
                    // Only disable click in wizard mode
                    pointerEvents: isWizardMode ? 'none' : 'auto',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {section.title}
                      </Typography>
                      {section.description && (
                        <Tooltip title={section.description}>
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <HelpIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    {!isWizardMode && onSectionEdit && (
                      <Box sx={{ ml: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        {editingSections.includes(section.key) ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<SaveIcon />}
                            onClick={() => {
                              // Find the accordion and close it
                              const accordion = accordionRefs.current[index];
                              if (accordion) {
                                const summary = accordion.querySelector('.MuiAccordionSummary-root');
                                if (summary && summary.classList.contains('Mui-expanded')) {
                                  (summary as HTMLElement).click();
                                }
                              }
                              // Call the section save handler
                              onSectionSave && onSectionSave(section.key);
                            }}
                          >
                            Save
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => {
                              // Find the accordion and expand it if it's not already expanded
                              const accordion = accordionRefs.current[index];
                              if (accordion) {
                                const summary = accordion.querySelector('.MuiAccordionSummary-root');
                                if (summary && !summary.classList.contains('Mui-expanded')) {
                                  (summary as HTMLElement).click();
                                }
                              }
                              // Call the section edit handler
                              onSectionEdit(section.key);
                            }}
                            disabled={false} // Always enable edit buttons
                          >
                            Edit
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Divider />
                  <Box sx={{ p: 2 }}>
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

      {/* Consistent navigation bar */}
      {showNavigation && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 1,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            justifyContent="space-between"
          >
            <Button
              variant="outlined"
              startIcon={<NavigateBeforeIcon />}
              onClick={handlePrevious}
              disabled={isFirstStep && !showDeploymentSettings && !showCompletion}
            >
              Previous
            </Button>
            <Button
              variant="contained"
              color={getNextButtonColor()}
              endIcon={getNextButtonIcon()}
              onClick={getNextButtonAction()}
              disabled={isNextButtonDisabled()}
            >
              {getNextButtonText()}
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default EnhancedConfigForm;
