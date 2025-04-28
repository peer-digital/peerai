import React from 'react';
import { TextField, TextFieldProps, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export interface SearchFieldProps extends Omit<TextFieldProps, 'variant'> {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
}

/**
 * Consistent search field component with search icon and optional clear button
 */
const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  size = 'small',
  fullWidth = true,
  ...props
}) => {
  return (
    <TextField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      variant="outlined"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 1,
          height: 40,
          '& fieldset': {
            borderColor: 'divider',
          },
        },
        ...props.sx
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: value && onClear ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={onClear}
              edge="end"
              aria-label="clear search"
              sx={{ p: 0.5 }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
        ...props.InputProps,
      }}
      {...props}
    />
  );
};

export default SearchField;
