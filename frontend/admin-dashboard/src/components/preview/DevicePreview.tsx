import React, { useState } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  useTheme,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  DesktopWindows as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Tablet as TabletIcon,
} from '@mui/icons-material';

interface DevicePreviewProps {
  html: string;
  title?: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const DevicePreview: React.FC<DevicePreviewProps> = ({ html, title }) => {
  const theme = useTheme();
  const [device, setDevice] = useState<DeviceType>('desktop');

  const handleDeviceChange = (
    event: React.MouseEvent<HTMLElement>,
    newDevice: DeviceType | null,
  ) => {
    if (newDevice !== null) {
      setDevice(newDevice);
    }
  };

  // Device frame styles
  const getDeviceStyles = () => {
    switch (device) {
      case 'mobile':
        return {
          width: '375px',
          height: '667px',
          borderRadius: '20px',
          border: `12px solid ${theme.palette.mode === 'dark' ? '#333' : '#ddd'}`,
          boxShadow: theme.shadows[4],
        };
      case 'tablet':
        return {
          width: '768px',
          height: '1024px',
          borderRadius: '12px',
          border: `8px solid ${theme.palette.mode === 'dark' ? '#333' : '#ddd'}`,
          boxShadow: theme.shadows[4],
        };
      case 'desktop':
      default:
        return {
          width: '100%',
          height: '100%',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '4px',
        };
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {title && (
          <Typography variant="subtitle1" fontWeight="medium">
            {title}
          </Typography>
        )}
        <ToggleButtonGroup
          value={device}
          exclusive
          onChange={handleDeviceChange}
          aria-label="device preview"
          size="small"
        >
          <Tooltip title="Desktop View">
            <ToggleButton value="desktop" aria-label="desktop view">
              <DesktopIcon />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Tablet View">
            <ToggleButton value="tablet" aria-label="tablet view">
              <TabletIcon />
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Mobile View">
            <ToggleButton value="mobile" aria-label="mobile view">
              <MobileIcon />
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'auto',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
          p: 3,
          borderRadius: 1,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            ...getDeviceStyles(),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <iframe
            srcDoc={html}
            title="App Preview"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default DevicePreview;
