import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  useTheme,
  Collapse,
  Link
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Session storage key for banner visibility
const BANNER_DISMISSED_KEY = 'announcement_banner_dismissed';
const BANNER_ID_KEY = 'announcement_banner_id';

interface AnnouncementBannerProps {
  message: string;
  ctaText?: string;
  ctaLink?: string;
  bannerColor?: string;
  textColor?: string;
  bannerId?: string; // Unique ID for this announcement - changing this will show the banner again
}

const BannerContainer = styled(Paper)(({ theme }) => ({
  position: 'relative', // Keep as relative to maintain normal document flow
  width: '100%',
  zIndex: 2, // Slightly higher z-index to ensure it's above content
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.5, 2),
  display: 'flex',
  alignItems: 'flex-start', // Align to top for better mobile layout
  justifyContent: 'space-between',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  marginBottom: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(1.5, 3),
    alignItems: 'center',
  },
}));

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  message,
  ctaText,
  ctaLink,
  bannerColor,
  textColor,
  bannerId = 'default',
}) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  // Default colors based on theme
  const defaultBannerColor = theme.palette.primary.main;
  const defaultTextColor = theme.palette.primary.contrastText;

  // Check session storage on mount to see if banner should be shown
  useEffect(() => {
    const isDismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
    const storedBannerId = sessionStorage.getItem(BANNER_ID_KEY);

    // Show banner if it hasn't been dismissed or if it's a new banner (different ID)
    if (!isDismissed || storedBannerId !== bannerId) {
      setIsVisible(true);
      // Store the current banner ID
      sessionStorage.setItem(BANNER_ID_KEY, bannerId);
    }
  }, [bannerId]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  return (
    <Collapse in={isVisible} sx={{ width: '100%' }}>
      <BannerContainer
        sx={{
          bgcolor: bannerColor || defaultBannerColor,
          color: textColor || defaultTextColor,
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, flexWrap: 'wrap' }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              mr: 2,
              mb: { xs: ctaText ? 1 : 0, sm: 0 }
            }}
          >
            {message}
          </Typography>

          {ctaText && ctaLink && (
            <Button
              variant="contained"
              size="small"
              component={Link}
              href={ctaLink}
              target="_blank"
              rel="noopener"
              sx={{
                mt: { xs: 0.5, sm: 0 },
                mb: { xs: 1, sm: 0 },
                color: textColor || defaultTextColor,
                borderColor: textColor || defaultTextColor,
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                }
              }}
            >
              {ctaText}
            </Button>
          )}
        </Box>

        <IconButton
          size="small"
          onClick={handleDismiss}
          sx={{
            color: textColor || defaultTextColor,
            ml: 1,
            mt: { xs: -0.5, sm: 0 }, // Adjust for top alignment on mobile
            alignSelf: 'flex-start', // Align to top
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </BannerContainer>
    </Collapse>
  );
};

export default AnnouncementBanner;
