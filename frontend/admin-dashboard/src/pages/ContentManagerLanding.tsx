import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  useTheme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  DesignServices as DesignServicesIcon,
  Rocket as RocketIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Storage as StorageIcon,
  Search as SearchIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageContainer, SectionContainer } from '../components/ui';

const ContentManagerLanding: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  // Handle navigation to App Library
  const handleGetStarted = () => {
    navigate('/app-library');
  };

  return (
    <PageContainer>
      {/* Hero Section */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Content Manager Portal
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
          Create and manage AI-powered applications for your organization without writing any code.
          Deploy in minutes and start delivering value immediately.
        </Typography>
      </Box>

      {/* App Creation Process */}
      <SectionContainer sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
          Create Your App in Minutes
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Step 1 */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: 1,
            mb: { xs: 3, md: 0 }
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              mb: 2
            }}>
              <CodeIcon fontSize="large" />
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>1. Select Template</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }}>
              Choose from our pre-built templates to get started quickly
            </Typography>
          </Box>

          {/* Connector Line - Desktop */}
          <Box sx={{
            flex: 0.5,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            height: '60px'
          }}>
            <Box sx={{ height: '2px', width: '100%', bgcolor: 'divider' }} />
            <CheckCircleIcon sx={{
              position: 'absolute',
              color: 'primary.main',
              bgcolor: theme.palette.background.paper,
              borderRadius: '50%'
            }} />
          </Box>

          {/* Step 2 */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: 1,
            mb: { xs: 3, md: 0 }
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              mb: 2
            }}>
              <DesignServicesIcon fontSize="large" />
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>2. Style & Configure</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }}>
              Customize your app's appearance and functionality
            </Typography>
          </Box>

          {/* Connector Line - Desktop */}
          <Box sx={{
            flex: 0.5,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            height: '60px'
          }}>
            <Box sx={{ height: '2px', width: '100%', bgcolor: 'divider' }} />
            <CheckCircleIcon sx={{
              position: 'absolute',
              color: 'primary.main',
              bgcolor: theme.palette.background.paper,
              borderRadius: '50%'
            }} />
          </Box>

          {/* Step 3 */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: 1
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              mb: 2
            }}>
              <RocketIcon fontSize="large" />
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>3. Deploy</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }}>
              Launch your app and share it with your team or organization
            </Typography>
          </Box>
        </Box>
      </SectionContainer>

      {/* Features Section */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: '0.375rem', transition: 'box-shadow 0.3s ease-in-out', '&:hover': { boxShadow: theme.shadows[3] } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
                <Typography variant="h6">Document Management</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Upload and manage your organization's documents. Our system automatically processes and indexes them for AI-powered search and retrieval.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: '0.375rem', transition: 'box-shadow 0.3s ease-in-out', '&:hover': { boxShadow: theme.shadows[3] } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SearchIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
                <Typography variant="h6">Intelligent Search</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Provide your users with powerful semantic search capabilities that understand the meaning behind queries, not just keywords.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: '0.375rem', transition: 'box-shadow 0.3s ease-in-out', '&:hover': { boxShadow: theme.shadows[3] } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ChatIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
                <Typography variant="h6">AI-Powered Chat</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Enable natural conversations with your data through our AI chatbot interface. Users can ask questions in plain language and get accurate answers.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: '0.375rem', transition: 'box-shadow 0.3s ease-in-out', '&:hover': { boxShadow: theme.shadows[3] } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SettingsIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
                <Typography variant="h6">Easy Customization</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Tailor your applications to match your brand and specific requirements without any coding knowledge required.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CTA after features */}
      <Box sx={{ mb: 6, mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={handleGetStarted}
          sx={{
            py: 1.5,
            px: 4,
            borderRadius: '0.25rem',
            fontSize: '1.1rem',
          }}
        >
          Get Started
        </Button>
      </Box>

      {/* Department Examples Section */}
      <Box sx={{
        mb: 6,
        p: 4,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: '0.375rem'
      }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
          Department Examples
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          See how different departments can create their own standalone chat applications with custom styling,
          each trained on their specific documents.
        </Typography>

        <Grid container spacing={4}>
          {/* HR Department */}
          <Grid item xs={12} md={6}>
            <Card sx={{
              height: '100%',
              borderRadius: '0.375rem',
              boxShadow: theme.shadows[1],
              border: `1px solid ${theme.palette.divider}`,
              transition: 'box-shadow 0.3s ease-in-out',
              '&:hover': { boxShadow: theme.shadows[3] }
            }}>
              <Box sx={{
                bgcolor: 'rgba(25, 118, 210, 0.7)', // slightly more muted primary
                color: 'white',
                p: 2,
                borderTopLeftRadius: 'calc(0.375rem - 1px)',
                borderTopRightRadius: 'calc(0.375rem - 1px)'
              }}>
                <Typography variant="h6">HR Department</Typography>
              </Box>
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                  Employee Handbook Assistant
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
              </CardContent>
            </Card>
          </Grid>

          {/* IT Support */}
          <Grid item xs={12} md={6}>
            <Card sx={{
              height: '100%',
              borderRadius: '0.375rem',
              boxShadow: theme.shadows[1],
              border: `1px solid ${theme.palette.divider}`,
              transition: 'box-shadow 0.3s ease-in-out',
              '&:hover': { boxShadow: theme.shadows[3] }
            }}>
              <Box sx={{
                bgcolor: 'rgba(46, 125, 50, 0.7)', // slightly more muted green
                color: 'white',
                p: 2,
                borderTopLeftRadius: 'calc(0.375rem - 1px)',
                borderTopRightRadius: 'calc(0.375rem - 1px)'
              }}>
                <Typography variant="h6">IT Support</Typography>
              </Box>
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                  Technical Support Assistant
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
                      <Typography variant="body2">Enable self-service problem resolution</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Reduce time to resolution for common issues</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Legal Team */}
          <Grid item xs={12} md={6}>
            <Card sx={{
              height: '100%',
              borderRadius: '0.375rem',
              boxShadow: theme.shadows[1],
              border: `1px solid ${theme.palette.divider}`,
              transition: 'box-shadow 0.3s ease-in-out',
              '&:hover': { boxShadow: theme.shadows[3] }
            }}>
              <Box sx={{
                bgcolor: 'rgba(2, 119, 189, 0.7)', // slightly more muted blue
                color: 'white',
                p: 2,
                borderTopLeftRadius: 'calc(0.375rem - 1px)',
                borderTopRightRadius: 'calc(0.375rem - 1px)'
              }}>
                <Typography variant="h6">Legal Team</Typography>
              </Box>
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                  Contract Assistant
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Develop a legal assistant trained on contract templates, legal precedents,
                  compliance documents, and internal policies.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    Benefits:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Box component="li">
                      <Typography variant="body2">Accelerate contract review processes</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Ensure consistent application of legal standards</Typography>
                    </Box>
                    <Box component="li">
                      <Typography variant="body2">Improve access to legal knowledge</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sales */}
          <Grid item xs={12} md={6}>
            <Card sx={{
              height: '100%',
              borderRadius: '0.375rem',
              boxShadow: theme.shadows[1],
              border: `1px solid ${theme.palette.divider}`,
              transition: 'box-shadow 0.3s ease-in-out',
              '&:hover': { boxShadow: theme.shadows[3] }
            }}>
              <Box sx={{
                bgcolor: 'rgba(198, 40, 40, 0.7)', // slightly more muted red
                color: 'white',
                p: 2,
                borderTopLeftRadius: 'calc(0.375rem - 1px)',
                borderTopRightRadius: 'calc(0.375rem - 1px)'
              }}>
                <Typography variant="h6">Sales</Typography>
              </Box>
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                  Product Information Chatbot
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          textAlign: 'center',
          p: 5,
          borderRadius: '0.375rem',
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(69, 137, 255, 0.15)' // Muted primary for dark mode
            : 'rgba(15, 98, 254, 0.08)', // Muted primary for light mode
          border: `1px solid ${theme.palette.mode === 'dark'
            ? 'rgba(69, 137, 255, 0.3)'
            : 'rgba(15, 98, 254, 0.2)'}`,
          color: 'text.primary',
          mb: 4,
          boxShadow: theme.shadows[1]
        }}
      >
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          Ready to create your first AI application?
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, fontWeight: 400, color: 'text.secondary' }}>
          Get started in minutes with our easy-to-use templates.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={handleGetStarted}
          sx={{
            py: 1.5,
            px: 4,
            borderRadius: '0.25rem',
            fontSize: '1.1rem',
            fontWeight: 600,
            boxShadow: theme.shadows[1],
            '&:hover': {
              boxShadow: theme.shadows[2],
            }
          }}
        >
          Get started
        </Button>
      </Box>
    </PageContainer>
  );
};

export default ContentManagerLanding;
