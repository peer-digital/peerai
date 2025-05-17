import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import {
  SmartToy as SmartToyIcon,
  VpnKey as ApiKeyIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useBreadcrumbsUpdate } from '../hooks/useBreadcrumbsUpdate';

const GetStarted: React.FC = () => {
  const theme = useTheme();
  const [examplesModalOpen, setExamplesModalOpen] = useState(false);

  // Set breadcrumbs for this page
  useBreadcrumbsUpdate([
    { label: 'Get Started' }
  ]);

  const handleOpenExamplesModal = () => {
    setExamplesModalOpen(true);
  };

  const handleCloseExamplesModal = () => {
    setExamplesModalOpen(false);
  };

  return (
    <>
      <Box sx={{
        flexGrow: 1,
        width: '100%',
        minWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}>
        <Box sx={{ mb: 6, textAlign: 'center', maxWidth: '800px' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.75rem', sm: '2.5rem' },
              mb: 4
            }}
          >
            Where should we start?
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ maxWidth: '1000px' }}>
          {/* Create AI App Card */}
          <Grid item xs={12} md={6}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: `1px solid ${theme.palette.primary.main}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: '50%',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }}>
                    <SmartToyIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Create AI App
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                  Build customized AI applications effortlessly
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.6 }}>
                  Deploy chatbots, knowledge bases, and intelligent search tools tailored to your organization's unique needs. No coding required.
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <Button
                  component={RouterLink}
                  to="/app-library"
                  color="primary"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    py: 1.5,
                    mb: 2,
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: '0.5rem',
                    boxShadow: theme.shadows[3],
                    '&:hover': {
                      boxShadow: theme.shadows[5],
                      color: 'white'
                    }
                  }}
                >
                  Browse App Library
                </Button>
                <Button
                  onClick={handleOpenExamplesModal}
                  color="primary"
                  variant="text"
                  sx={{
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      color: theme.palette.primary.main
                    }
                  }}
                >
                  See examples
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Create API Key Card */}
          <Grid item xs={12} md={6}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: `1px solid ${theme.palette.secondary.main}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{
                    bgcolor: 'secondary.main',
                    color: 'white',
                    borderRadius: '50%',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }}>
                    <ApiKeyIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Create API Key
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                  Integrate powerful AI into your apps
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.6 }}>
                  Securely manage API keys and access state-of-the-art language models directly within your existing applications.
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <Button
                  component={RouterLink}
                  to="/api-keys"
                  color="secondary"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    py: 1.5,
                    mb: 2,
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: '0.5rem',
                    boxShadow: theme.shadows[3],
                    '&:hover': {
                      boxShadow: theme.shadows[5],
                      color: 'white'
                    }
                  }}
                >
                  Manage API Keys
                </Button>
                <Button
                  component={RouterLink}
                  to="/playground"
                  color="secondary"
                  variant="text"
                  sx={{
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: 'rgba(156, 39, 176, 0.08)',
                      color: theme.palette.secondary.main
                    }
                  }}
                >
                  Open Playground
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Examples Modal */}
    <Dialog
      open={examplesModalOpen}
      onClose={handleCloseExamplesModal}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '0.5rem',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            App Examples
          </Typography>
          <IconButton edge="end" color="inherit" onClick={handleCloseExamplesModal} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" paragraph>
          See how different departments can create their own standalone AI applications with custom styling,
          each trained on their specific documents.
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* HR Example */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{
              height: '100%',
              borderRadius: '0.375rem',
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}`,
            }}>
              <Box sx={{
                bgcolor: 'primary.main',
                color: 'white',
                p: 2,
                borderTopLeftRadius: 'calc(0.375rem - 1px)',
                borderTopRightRadius: 'calc(0.375rem - 1px)'
              }}>
                <Typography variant="h6">HR Department</Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ChatIcon color="primary" sx={{ mr: 1.5, fontSize: 28 }} />
                  <Typography variant="h6">Employee Handbook Assistant</Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Create a chatbot trained on employee handbooks, HR policies, benefits information,
                  and onboarding materials.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    Benefits:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Box component="li">
                      <Typography variant="body2">Reduce repetitive HR inquiries</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Provide 24/7 access to HR information</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Streamline employee onboarding</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* IT Support Example */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{
              height: '100%',
              borderRadius: '0.375rem',
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}`,
            }}>
              <Box sx={{
                bgcolor: '#2e7d32', // Green
                color: 'white',
                p: 2,
                borderTopLeftRadius: 'calc(0.375rem - 1px)',
                borderTopRightRadius: 'calc(0.375rem - 1px)'
              }}>
                <Typography variant="h6">IT Support</Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SearchIcon color="primary" sx={{ mr: 1.5, fontSize: 28 }} />
                  <Typography variant="h6">Technical Support Assistant</Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Build a support assistant trained on troubleshooting guides, system documentation,
                  and common IT issues.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    Benefits:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Box component="li">
                      <Typography variant="body2">Decrease support ticket volume</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Provide instant solutions to common problems</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Improve employee productivity</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Sales Example */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{
              height: '100%',
              borderRadius: '0.375rem',
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}`,
            }}>
              <Box sx={{
                bgcolor: '#c62828', // Red
                color: 'white',
                p: 2,
                borderTopLeftRadius: 'calc(0.375rem - 1px)',
                borderTopRightRadius: 'calc(0.375rem - 1px)'
              }}>
                <Typography variant="h6">Sales</Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DescriptionIcon color="primary" sx={{ mr: 1.5, fontSize: 28 }} />
                  <Typography variant="h6">Product Information Chatbot</Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Design a sales assistant trained on product specifications, pricing information,
                  competitive analyses, and frequently asked questions.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    Benefits:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Box component="li">
                      <Typography variant="body2">Provide instant answers to customer inquiries</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Equip sales team with accurate product information</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Increase conversion rates with timely responses</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Legal Example */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{
              height: '100%',
              borderRadius: '0.375rem',
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}`,
            }}>
              <Box sx={{
                bgcolor: '#0277bd', // Blue
                color: 'white',
                p: 2,
                borderTopLeftRadius: 'calc(0.375rem - 1px)',
                borderTopRightRadius: 'calc(0.375rem - 1px)'
              }}>
                <Typography variant="h6">Legal</Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SearchIcon color="primary" sx={{ mr: 1.5, fontSize: 28 }} />
                  <Typography variant="h6">Contract Analysis Assistant</Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Create an AI assistant that can analyze contracts, legal documents, and compliance requirements
                  to provide quick insights and summaries.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    Benefits:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Box component="li">
                      <Typography variant="body2">Speed up contract review process</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Identify potential issues and risks</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Improve compliance with regulations</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseExamplesModal}>Close</Button>
        <Button
          component={RouterLink}
          to="/app-library"
          variant="contained"
          color="primary"
          endIcon={<ArrowForwardIcon />}
        >
          Browse App Library
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default GetStarted;