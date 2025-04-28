import React from 'react';
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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { JSONSchema7 } from 'json-schema';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { IChangeEvent } from '@rjsf/core';

interface EnhancedConfigFormProps {
  schema: JSONSchema7;
  uiSchema?: any;
  formData: any;
  onChange: (data: { formData: any }) => void;
  disabled?: boolean;
}

const EnhancedConfigForm: React.FC<EnhancedConfigFormProps> = ({
  schema,
  uiSchema,
  formData,
  onChange,
  disabled = false,
}) => {
  const theme = useTheme();

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

  return (
    <Box sx={{ width: '100%' }}>
      {sections.map((section, index) => (
        <Accordion
          key={section.key}
          defaultExpanded={index === 0}
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
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`${section.key}-content`}
            id={`${section.key}-header`}
            sx={{
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.03)',
              borderRadius: '8px 8px 0 0',
            }}
          >
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
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Divider />
            <Box sx={{ p: 2 }}>
              {section.isObject ? (
                // For object sections, create a form for the nested properties
                <Form
                  schema={{
                    type: 'object',
                    properties: section.properties,
                  } as JSONSchema7}
                  formData={formData[section.key] || {}}
                  onChange={(data: IChangeEvent<any>) => handleSectionChange(section.key, data)}
                  validator={validator}
                  disabled={disabled}
                  uiSchema={getCustomUiSchema(section.key)}
                />
              ) : (
                // For top-level properties, create a form with just that property
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
                  disabled={disabled}
                  uiSchema={getCustomUiSchema(section.key)}
                />
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default EnhancedConfigForm;
