import React, { useState } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  useTheme,
  Typography,
  Tooltip,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  AppBar,
  Toolbar,
  useMediaQuery,
} from '@mui/material';
import {
  DesktopWindows as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Tablet as TabletIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface DevicePreviewProps {
  html: string;
  title?: string;
  hideDeviceOptions?: boolean;
  hideFullscreenButton?: boolean;
  onFullscreen?: () => void;
  externalFullscreenControl?: boolean;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const DevicePreview: React.FC<DevicePreviewProps> = ({
  html,
  title,
  hideDeviceOptions = false,
  hideFullscreenButton = false,
  onFullscreen,
  externalFullscreenControl = false
}) => {
  const theme = useTheme();
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [fullscreen, setFullscreen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDeviceChange = (
    event: React.MouseEvent<HTMLElement>,
    newDevice: DeviceType | null,
  ) => {
    if (newDevice !== null) {
      setDevice(newDevice);
    }
  };

  const handleFullscreen = () => {
    if (externalFullscreenControl && onFullscreen) {
      onFullscreen();
    } else {
      setFullscreen(true);
    }
  };

  // Device frame styles
  const getDeviceStyles = () => {
    switch (device) {
      case 'mobile':
        return {
          width: '375px',
          height: '667px',
          maxHeight: '80vh', // Limit height on smaller screens
          borderRadius: '20px',
          border: `12px solid ${theme.palette.mode === 'dark' ? '#333' : '#ddd'}`,
          boxShadow: theme.shadows[4],
        };
      case 'tablet':
        return {
          width: '768px',
          height: '1024px',
          maxHeight: '80vh', // Limit height on smaller screens
          borderRadius: '12px',
          border: `8px solid ${theme.palette.mode === 'dark' ? '#333' : '#ddd'}`,
          boxShadow: theme.shadows[4],
        };
      case 'desktop':
      default:
        return {
          width: fullscreen ? '100%' : '100%',
          minWidth: fullscreen ? '800px' : '100%', // Ensure desktop is wide enough
          maxWidth: '100%', // Prevent overflow
          height: fullscreen ? '100%' : '600px',
          minHeight: fullscreen ? '100%' : '600px',
          maxHeight: '80vh', // Limit height on smaller screens
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '4px',
        };
    }
  };

  const renderDevicePreview = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {title && (
          <Typography variant="subtitle1" fontWeight="medium">
            {title}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Only show device options when not hidden */}
          {!hideDeviceOptions && (
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
          )}
          {!hideFullscreenButton && !isMobile && (
            <Tooltip title="Fullscreen Mode">
              <IconButton
                onClick={handleFullscreen}
                size="small"
                sx={{ ml: hideDeviceOptions ? 0 : 1 }}
                aria-label="fullscreen mode"
              >
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
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
          minHeight: device === 'desktop' ? '600px' : 'auto',
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

  // Fullscreen dialog
  const renderFullscreenPreview = () => (
    <Dialog
      fullScreen
      open={fullscreen}
      onClose={() => setFullscreen(false)}
      sx={{
        '& .MuiDialog-paper': {
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)'
        }
      }}
    >
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            {title || 'Preview'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
            <IconButton
              color="inherit"
              onClick={() => setFullscreen(false)}
              aria-label="close fullscreen"
              sx={{ ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <DialogContent sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3,
        height: 'calc(100vh - 64px)' // Subtract the AppBar height
      }}>
        <Paper
          elevation={0}
          sx={{
            ...getDeviceStyles(),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: device === 'desktop' ? '100%' : undefined,
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
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {renderDevicePreview()}
      {renderFullscreenPreview()}
    </>
  );
};

export default DevicePreview;
