import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`legal-tabpanel-${index}`}
      aria-labelledby={`legal-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `legal-tab-${index}`,
    'aria-controls': `legal-tabpanel-${index}`,
  };
}

const LegalPages: React.FC = () => {
  const [value, setValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();

  // Check for tab parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 1) {
        setValue(tabIndex);
      }
    }
  }, [location]);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, pb: 1, display: 'flex', alignItems: 'center' }}>
          <Link
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              textDecoration: 'none',
              mr: 2,
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} />
            {!isMobile && 'Back to Home'}
          </Link>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Policies
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="legal tabs"
              variant={isMobile ? "fullWidth" : "standard"}
            >
              <Tab label="Terms of Use" {...a11yProps(0)} />
              <Tab label="Privacy Policy" {...a11yProps(1)} />
            </Tabs>
          </Box>

          <TabPanel value={value} index={0}>
            <Typography variant="h6" gutterBottom>
              Terms of Use
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              1. Acceptance of Terms
            </Typography>
            <Typography paragraph>
              By accessing or using Peer AI's services, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              2. Service Description
            </Typography>
            <Typography paragraph>
              Peer AI provides artificial intelligence and large language model (LLM) services designed to assist users with various tasks. Our services are intended to be used as tools to augment human capabilities, not to replace human judgment.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              3. Legitimate Use
            </Typography>
            <Typography paragraph>
              You agree to use our services only for legitimate and lawful purposes. You shall not use our services to:
            </Typography>
            <Typography component="div" sx={{ pl: 2 }}>
              <ul>
                <li>Generate, promote, or distribute illegal, harmful, fraudulent, or deceptive content</li>
                <li>Violate the rights of others, including intellectual property rights</li>
                <li>Harass, abuse, or harm another person or entity</li>
                <li>Impersonate others or misrepresent your affiliation with any person or entity</li>
                <li>Engage in activities that violate applicable laws or regulations</li>

              </ul>
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              4. User Responsibilities
            </Typography>
            <Typography paragraph>
              You are responsible for:
            </Typography>
            <Typography component="div" sx={{ pl: 2 }}>
              <ul>
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring that your use of our services complies with these Terms</li>
                <li>Reviewing and verifying the output generated by our services before use</li>
                <li>Complying with all applicable laws and regulations</li>
              </ul>
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              5. Content and Data
            </Typography>
            <Typography paragraph>
              You retain ownership of any content you submit to our services. We process your content solely for the purpose of generating responses through our AI service providers.
            </Typography>
            <Typography paragraph>
              We do not claim ownership of the outputs generated by our services based on your inputs, and we do not store or use your inputs or the generated outputs to train or improve AI models.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              6. Limitation of Liability
            </Typography>
            <Typography paragraph>
              Our services are provided "as is" without warranties of any kind, either express or implied. We do not guarantee that our services will be uninterrupted or error-free.
            </Typography>
            <Typography paragraph>
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our services.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              7. Modifications to Terms
            </Typography>
            <Typography paragraph>
              We reserve the right to modify these Terms at any time. We will provide notice of significant changes by posting the updated Terms on our website. Your continued use of our services after such modifications constitutes your acceptance of the updated Terms.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              8. Termination
            </Typography>
            <Typography paragraph>
              We reserve the right to suspend or terminate your access to our services at any time for violations of these Terms or for any other reason at our discretion.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              9. Governing Law
            </Typography>
            <Typography paragraph>
              These Terms shall be governed by and construed in accordance with the laws of Sweden, without regard to its conflict of law provisions.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              10. Contact Information
            </Typography>
            <Typography paragraph>
              If you have any questions about these Terms, please contact us at support@peerdigital.se.
            </Typography>

            <Typography variant="body2" sx={{ mt: 4, color: 'text.secondary' }}>
              Last updated: {new Date().toLocaleDateString()}
            </Typography>
          </TabPanel>

          <TabPanel value={value} index={1}>
            <Typography variant="h6" gutterBottom>
              Privacy Policy
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              1. Introduction
            </Typography>
            <Typography paragraph>
              At Peer AI, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              2. Information We Collect
            </Typography>
            <Typography paragraph>
              We collect only the minimum information necessary to provide our services:
            </Typography>
            <Typography component="div" sx={{ pl: 2 }}>
              <ul>
                <li><strong>Account Information:</strong> When you register for an account, we collect your name and email address.</li>
                <li><strong>Usage Metrics:</strong> We track basic usage metrics solely for billing purposes, such as the number of requests made to determine costs. We do not store the content of your queries or the responses generated.</li>
              </ul>
            </Typography>
            <Typography paragraph>
              We do not collect or store technical data such as device information, browser details, or IP addresses beyond what is temporarily needed during your session.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              3. Data Storage and Processing
            </Typography>
            <Typography paragraph>
              Peer AI maintains its servers and data storage facilities in Sweden. The limited account information we collect is stored within Sweden.
            </Typography>
            <Typography paragraph>
              When you use our services, your queries are passed to our third-party AI processing partners who are EU-based companies that process data in Sweden. We do not store the content of these queries or the responses on our servers.
            </Typography>
            <Typography paragraph>
              For the purpose of abuse monitoring, our AI processing partners may store data for up to 30 days within the European Union. This is necessary to prevent misuse of the service. After this period, any such data is permanently deleted.
            </Typography>
            <Typography paragraph>
              As both Peer AI and our partners are EU-based companies, we are not subject to the US CLOUD Act or similar legislation that affects US-based companies. This provides an additional layer of protection for your data.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              4. How We Use Your Information
            </Typography>
            <Typography paragraph>
              We use your information for the following limited purposes:
            </Typography>
            <Typography component="div" sx={{ pl: 2 }}>
              <ul>
                <li>To provide and maintain our services</li>
                <li>To process your queries through our AI service providers</li>
                <li>To calculate usage for billing purposes</li>
                <li>To communicate with you about service-related matters</li>
                <li>To comply with legal obligations</li>
              </ul>
            </Typography>
            <Typography paragraph>
              We do not use your data for marketing, profiling, or service improvement purposes beyond what is strictly necessary to provide the service.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              5. Data Retention
            </Typography>
            <Typography paragraph>
              We retain your account information (name and email) only for as long as your account is active. If you delete your account, this information is permanently removed from our systems.
            </Typography>
            <Typography paragraph>
              We do not retain the content of your queries or the responses generated. This data is only processed in real-time to provide the service.
            </Typography>
            <Typography paragraph>
              As mentioned earlier, for abuse monitoring purposes, our AI processing partners may retain data for up to 30 days within the EU, after which it is permanently deleted.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              6. Data Security
            </Typography>
            <Typography paragraph>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </Typography>
            <Typography paragraph>
              While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security. You are responsible for maintaining the confidentiality of your account credentials.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              7. Your Rights
            </Typography>
            <Typography paragraph>
              Under the General Data Protection Regulation (GDPR) and other applicable data protection laws, you have certain rights regarding your personal information, including:
            </Typography>
            <Typography component="div" sx={{ pl: 2 }}>
              <ul>
                <li>The right to access your personal information</li>
                <li>The right to rectify inaccurate or incomplete information</li>
                <li>The right to erasure (the "right to be forgotten")</li>
                <li>The right to restrict processing</li>
                <li>The right to data portability</li>
                <li>The right to object to processing</li>
                <li>The right to withdraw consent</li>
              </ul>
            </Typography>
            <Typography paragraph>
              To exercise these rights, please contact us at support@peerdigital.se.
            </Typography>



            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              8. Changes to This Privacy Policy
            </Typography>
            <Typography paragraph>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
              9. Contact Us
            </Typography>
            <Typography paragraph>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </Typography>
            <Typography paragraph>
              Email: support@peerdigital.se
            </Typography>

            <Typography variant="body2" sx={{ mt: 4, color: 'text.secondary' }}>
              Last updated: {new Date().toLocaleDateString()}
            </Typography>
          </TabPanel>
        </Box>
      </Paper>
    </Container>
  );
};

export default LegalPages;
