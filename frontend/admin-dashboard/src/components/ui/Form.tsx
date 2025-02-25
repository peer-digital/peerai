import React, { useState, ReactNode } from 'react';
import { 
  Box, 
  Button, 
  Grid, 
  TextField, 
  Typography, 
  FormHelperText, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Switch,
  FormGroup,
  Divider,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Field types supported by the form
export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'select' 
  | 'multiselect' 
  | 'checkbox' 
  | 'switch' 
  | 'textarea';

// Option interface for select fields
export interface SelectOption {
  value: string | number;
  label: string;
}

// Validation rules for form fields
export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  match?: string; // Field name to match (e.g., for password confirmation)
  custom?: (value: any, formValues: Record<string, any>) => boolean | string;
}

// Field definition for form fields
export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: any;
  options?: SelectOption[];
  validation?: ValidationRules;
  disabled?: boolean;
  fullWidth?: boolean;
  helperText?: string;
  autoFocus?: boolean;
  size?: 'small' | 'medium';
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

// Form section for grouping fields
export interface FormSection {
  title?: string;
  description?: string;
  fields: FormField[];
}

// Props for the Form component
interface FormProps {
  /**
   * Form sections containing fields
   */
  sections: FormSection[];
  
  /**
   * Function called on form submission with validated form values
   */
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  
  /**
   * Initial values for form fields
   */
  initialValues?: Record<string, any>;
  
  /**
   * Text for the submit button
   */
  submitText?: string;
  
  /**
   * Whether the form is in a loading state
   */
  loading?: boolean;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Success message to display
   */
  success?: string;
  
  /**
   * Whether to show a cancel button
   */
  showCancel?: boolean;
  
  /**
   * Text for the cancel button
   */
  cancelText?: string;
  
  /**
   * Function called when cancel button is clicked
   */
  onCancel?: () => void;
  
  /**
   * Additional content to render at the bottom of the form
   */
  footer?: ReactNode;
  
  /**
   * Whether to disable the form
   */
  disabled?: boolean;
  
  /**
   * Whether to use a compact layout
   */
  compact?: boolean;
}

// Styled components
const FormContainer = styled('form')(({ theme }) => ({
  width: '100%',
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const FormSectionTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: 600,
}));

const FormSectionDescription = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  color: theme.palette.text.secondary,
}));

const FormActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(2),
  marginTop: theme.spacing(3),
}));

const ErrorMessage = styled(FormHelperText)(({ theme }) => ({
  color: theme.palette.error.main,
  marginBottom: theme.spacing(2),
  fontSize: '0.875rem',
}));

const SuccessMessage = styled(FormHelperText)(({ theme }) => ({
  color: theme.palette.success.main,
  marginBottom: theme.spacing(2),
  fontSize: '0.875rem',
}));

/**
 * Reusable Form component with validation support
 * Supports various field types and validation rules
 */
const Form: React.FC<FormProps> = ({
  sections,
  onSubmit,
  initialValues = {},
  submitText = 'Submit',
  loading = false,
  error,
  success,
  showCancel = false,
  cancelText = 'Cancel',
  onCancel,
  footer,
  disabled = false,
  compact = false,
}) => {
  // Initialize form values from initialValues or default values
  const getInitialFormValues = () => {
    const values: Record<string, any> = {};
    
    sections.forEach(section => {
      section.fields.forEach(field => {
        if (initialValues && initialValues[field.name] !== undefined) {
          values[field.name] = initialValues[field.name];
        } else if (field.defaultValue !== undefined) {
          values[field.name] = field.defaultValue;
        } else {
          // Set default empty values based on field type
          switch (field.type) {
            case 'checkbox':
            case 'switch':
              values[field.name] = false;
              break;
            case 'multiselect':
              values[field.name] = [];
              break;
            default:
              values[field.name] = '';
          }
        }
      });
    });
    
    return values;
  };
  
  // State for form values, errors, and touched fields
  const [formValues, setFormValues] = useState<Record<string, any>>(getInitialFormValues());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  
  // Validate a single field
  const validateField = (name: string, value: any): string => {
    // Find the field definition
    let field: FormField | undefined;
    for (const section of sections) {
      const foundField = section.fields.find(f => f.name === name);
      if (foundField) {
        field = foundField;
        break;
      }
    }
    
    if (!field || !field.validation) return '';
    
    const validation = field.validation;
    
    // Required validation
    if (validation.required && (value === '' || value === null || value === undefined || 
        (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`;
    }
    
    // Skip other validations if value is empty and not required
    if (value === '' || value === null || value === undefined) return '';
    
    // String validations
    if (typeof value === 'string') {
      // Min length validation
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      
      // Max length validation
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        return `${field.label} must be at most ${validation.maxLength} characters`;
      }
      
      // Pattern validation
      if (validation.pattern && !validation.pattern.test(value)) {
        return `${field.label} has an invalid format`;
      }
      
      // Email validation
      if (validation.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
        return `${field.label} must be a valid email address`;
      }
    }
    
    // Number validations
    if (typeof value === 'number' || (field.type === 'number' && value !== '')) {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      
      // Min validation
      if (validation.min !== undefined && numValue < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }
      
      // Max validation
      if (validation.max !== undefined && numValue > validation.max) {
        return `${field.label} must be at most ${validation.max}`;
      }
    }
    
    // Match validation (e.g., for password confirmation)
    if (validation.match && formValues[validation.match] !== value) {
      return `${field.label} does not match`;
    }
    
    // Custom validation
    if (validation.custom) {
      const result = validation.custom(value, formValues);
      if (typeof result === 'string') {
        return result;
      } else if (result === false) {
        return `${field.label} is invalid`;
      }
    }
    
    return '';
  };
  
  // Validate all form fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    // Validate each field
    Object.keys(formValues).forEach(name => {
      const error = validateField(name, formValues[name]);
      if (error) {
        errors[name] = error;
        isValid = false;
      }
    });
    
    setFormErrors(errors);
    return isValid;
  };
  
  // Handle field change
  const handleChange = (name: string, value: any) => {
    // Update form values
    setFormValues(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Mark field as touched
    if (!touchedFields[name]) {
      setTouchedFields(prev => ({
        ...prev,
        [name]: true,
      }));
    }
    
    // Validate field
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formValues).forEach(name => {
      allTouched[name] = true;
    });
    setTouchedFields(allTouched);
    
    // Validate form
    const isValid = validateForm();
    if (!isValid) return;
    
    // Call onSubmit with form values
    await onSubmit(formValues);
  };
  
  // Render a form field based on its type
  const renderField = (field: FormField) => {
    const {
      name,
      label,
      type,
      placeholder,
      options,
      disabled: fieldDisabled,
      fullWidth = true,
      helperText,
      autoFocus,
      size = 'medium',
    } = field;
    
    const value = formValues[name];
    const error = touchedFields[name] ? formErrors[name] : '';
    const isDisabled = disabled || fieldDisabled || loading;
    
    // Common props for all field types
    const commonProps = {
      id: name,
      name,
      label,
      value,
      error: !!error,
      helperText: error || helperText,
      disabled: isDisabled,
      fullWidth,
      size,
      autoFocus,
      onChange: (e: React.ChangeEvent<any>) => handleChange(name, e.target.value),
      onBlur: () => {
        if (!touchedFields[name]) {
          setTouchedFields(prev => ({
            ...prev,
            [name]: true,
          }));
          const error = validateField(name, value);
          setFormErrors(prev => ({
            ...prev,
            [name]: error,
          }));
        }
      },
    };
    
    switch (type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <TextField
            {...commonProps}
            type={type}
            placeholder={placeholder}
          />
        );
        
      case 'number':
        return (
          <TextField
            {...commonProps}
            type="number"
            placeholder={placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value === '' ? '' : parseFloat(e.target.value);
              handleChange(name, value);
            }}
          />
        );
        
      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            rows={4}
            placeholder={placeholder}
          />
        );
        
      case 'select':
        return (
          <FormControl fullWidth={fullWidth} error={!!error} size={size} disabled={isDisabled}>
            <InputLabel id={`${name}-label`}>{label}</InputLabel>
            <Select
              labelId={`${name}-label`}
              id={name}
              value={value}
              label={label}
              onChange={(e) => handleChange(name, e.target.value)}
              onBlur={() => {
                if (!touchedFields[name]) {
                  setTouchedFields(prev => ({
                    ...prev,
                    [name]: true,
                  }));
                  const error = validateField(name, value);
                  setFormErrors(prev => ({
                    ...prev,
                    [name]: error,
                  }));
                }
              }}
            >
              {options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(error || helperText) && (
              <FormHelperText>{error || helperText}</FormHelperText>
            )}
          </FormControl>
        );
        
      case 'multiselect':
        return (
          <FormControl fullWidth={fullWidth} error={!!error} size={size} disabled={isDisabled}>
            <InputLabel id={`${name}-label`}>{label}</InputLabel>
            <Select
              labelId={`${name}-label`}
              id={name}
              multiple
              value={value || []}
              label={label}
              onChange={(e) => handleChange(name, e.target.value)}
              onBlur={() => {
                if (!touchedFields[name]) {
                  setTouchedFields(prev => ({
                    ...prev,
                    [name]: true,
                  }));
                  const error = validateField(name, value);
                  setFormErrors(prev => ({
                    ...prev,
                    [name]: error,
                  }));
                }
              }}
            >
              {options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(error || helperText) && (
              <FormHelperText>{error || helperText}</FormHelperText>
            )}
          </FormControl>
        );
        
      case 'checkbox':
        return (
          <FormControl error={!!error} disabled={isDisabled}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!value}
                  onChange={(e) => handleChange(name, e.target.checked)}
                  name={name}
                />
              }
              label={label}
            />
            {(error || helperText) && (
              <FormHelperText>{error || helperText}</FormHelperText>
            )}
          </FormControl>
        );
        
      case 'switch':
        return (
          <FormControl error={!!error} disabled={isDisabled}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!value}
                  onChange={(e) => handleChange(name, e.target.checked)}
                  name={name}
                />
              }
              label={label}
            />
            {(error || helperText) && (
              <FormHelperText>{error || helperText}</FormHelperText>
            )}
          </FormControl>
        );
        
      default:
        return <Typography color="error">Unsupported field type: {type}</Typography>;
    }
  };
  
  return (
    <FormContainer onSubmit={handleSubmit} noValidate>
      {sections.map((section, sectionIndex) => (
        <FormSection key={sectionIndex}>
          {section.title && (
            <FormSectionTitle variant="h6">{section.title}</FormSectionTitle>
          )}
          
          {section.description && (
            <FormSectionDescription variant="body2">
              {section.description}
            </FormSectionDescription>
          )}
          
          <Grid container spacing={compact ? 2 : 3}>
            {section.fields.map((field) => (
              <Grid 
                item 
                xs={field.xs || 12} 
                sm={field.sm} 
                md={field.md} 
                lg={field.lg} 
                xl={field.xl}
                key={field.name}
              >
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
          
          {sectionIndex < sections.length - 1 && (
            <Divider sx={{ my: 3 }} />
          )}
        </FormSection>
      ))}
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      <FormActions>
        {showCancel && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
        )}
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading || disabled}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {submitText}
        </Button>
      </FormActions>
      
      {footer && (
        <Box mt={2}>
          {footer}
        </Box>
      )}
    </FormContainer>
  );
};

export default Form; 