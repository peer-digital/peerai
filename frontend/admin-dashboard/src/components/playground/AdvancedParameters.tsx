import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Slider,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface AdvancedParametersProps {
  requestBody: string;
  setRequestBody: (body: string) => void;
}

const AdvancedParameters: React.FC<AdvancedParametersProps> = ({ requestBody, setRequestBody }) => {
  const [expanded, setExpanded] = useState(false);

  // Parse the current request body
  const parseRequestBody = () => {
    try {
      return JSON.parse(requestBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return {
        prompt: "Explain quantum computing",
        max_tokens: 100,
        temperature: 0.7,
        top_p: 1.0,
      };
    }
  };

  // Update a specific parameter in the request body
  const updateParameter = (param: string, value: any) => {
    try {
      const currentBody = parseRequestBody();
      const newBody = {
        ...currentBody,
        [param]: value,
      };
      setRequestBody(JSON.stringify(newBody, null, 2));
    } catch (e) {
      console.error('Failed to update parameter:', e);
    }
  };

  // Get the current value of a parameter
  const getParameterValue = (param: string, defaultValue: any) => {
    try {
      const currentBody = parseRequestBody();
      return currentBody[param] !== undefined ? currentBody[param] : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{ mb: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Advanced Parameters</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>Temperature</Typography>
              <Tooltip title="Controls randomness: Lower values are more deterministic, higher values more creative. Range: 0.0 to 1.0">
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
            <Slider
              value={getParameterValue('temperature', 0.7)}
              onChange={(_, value) => updateParameter('temperature', value)}
              min={0}
              max={1}
              step={0.01}
              valueLabelDisplay="auto"
            />
            <TextField
              size="small"
              type="number"
              value={getParameterValue('temperature', 0.7)}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 1) {
                  updateParameter('temperature', value);
                }
              }}
              InputProps={{
                inputProps: { min: 0, max: 1, step: 0.01 },
              }}
              sx={{ width: '100%', mt: 1 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>Top P</Typography>
              <Tooltip title="Nucleus sampling: Only consider tokens with top_p cumulative probability. Range: 0.0 to 1.0">
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
            <Slider
              value={getParameterValue('top_p', 1.0)}
              onChange={(_, value) => updateParameter('top_p', value)}
              min={0}
              max={1}
              step={0.01}
              valueLabelDisplay="auto"
            />
            <TextField
              size="small"
              type="number"
              value={getParameterValue('top_p', 1.0)}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 1) {
                  updateParameter('top_p', value);
                }
              }}
              InputProps={{
                inputProps: { min: 0, max: 1, step: 0.01 },
              }}
              sx={{ width: '100%', mt: 1 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Max Tokens"
              type="number"
              value={getParameterValue('max_tokens', 100)}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value > 0) {
                  updateParameter('max_tokens', value);
                }
              }}
              InputProps={{
                inputProps: { min: 1 },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Maximum number of tokens to generate. If not specified, uses system default.">
                      <InfoOutlinedIcon fontSize="small" color="action" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Random Seed"
              type="number"
              value={getParameterValue('random_seed', '')}
              onChange={(e) => {
                if (e.target.value === '') {
                  // If empty, set to undefined
                  updateParameter('random_seed', undefined);
                } else {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    updateParameter('random_seed', value);
                  }
                }
              }}
              InputProps={{
                inputProps: { min: 0 },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Seed for deterministic generation. Leave empty for random results.">
                      <InfoOutlinedIcon fontSize="small" color="action" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Stop Sequences"
              placeholder="Comma-separated list of stop sequences"
              value={getParameterValue('stop', '')}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  updateParameter('stop', undefined);
                } else if (value.includes(',')) {
                  // If there are commas, treat as array
                  const stopArray = value.split(',').map(s => s.trim()).filter(Boolean);
                  updateParameter('stop', stopArray);
                } else {
                  // Otherwise treat as single string
                  updateParameter('stop', value);
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Sequences where the API will stop generating. Can be a string or comma-separated list.">
                      <InfoOutlinedIcon fontSize="small" color="action" />
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default AdvancedParameters;
