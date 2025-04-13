import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Rocket as RocketIcon,
  Code as CodeIcon,
  MenuBook as MenuBookIcon,
  VpnKey as ApiKeyIcon,
  GitHub as GitHubIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

const GetStarted: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1, width: '100%', minWidth: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2rem' } }} gutterBottom>
          Welcome to PeerAI
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Get started with our powerful AI platform for developers and businesses
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Quick Start Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RocketIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5">Quick Start</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                Get up and running with PeerAI in minutes. Our platform provides state-of-the-art
                AI models through a simple and intuitive API.
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CodeIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Simple API Integration" secondary="Easy to use with any programming language" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ApiKeyIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="API Key Authentication" secondary="Secure and straightforward authentication" />
                </ListItem>
              </List>
            </CardContent>
            <CardActions>
              <Button
                component={RouterLink}
                to="/docs"
                color="primary"
                variant="contained"
              >
                View Documentation
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                color="primary"
              >
                Sign In
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Resources Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MenuBookIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5">Resources</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                Explore our comprehensive resources to help you make the most of PeerAI.
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <GitHubIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Sample Projects" secondary="Example implementations in various languages" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SchoolIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Tutorials" secondary="Step-by-step guides for common use cases" />
                </ListItem>
              </List>
            </CardContent>
            <CardActions>
              <Button
                component="a"
                href="https://github.com/peerai/api-examples"
                target="_blank"
                color="primary"
                variant="outlined"
                startIcon={<GitHubIcon />}
              >
                GitHub Examples
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Featured Use Cases */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h5" gutterBottom>
              Featured Use Cases
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Content Generation
                  </Typography>
                  <Typography variant="body2">
                    Create high-quality content for marketing, product descriptions,
                    and more using our advanced language models.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Customer Support
                  </Typography>
                  <Typography variant="body2">
                    Build intelligent chatbots and support systems that can understand
                    and respond to customer inquiries effectively.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Data Analysis
                  </Typography>
                  <Typography variant="body2">
                    Extract insights from unstructured data, summarize documents,
                    and automate data processing workflows.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GetStarted;