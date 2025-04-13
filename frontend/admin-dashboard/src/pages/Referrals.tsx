import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import ReferralModal from '../components/ReferralModal';

const Referrals: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Referrals
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          Refer a Friend
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Invite friends to Peer AI and earn tokens for both you and your referrals! Each successful referral earns both parties 10,000 tokens.
      </Alert>

      <ReferralModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </Box>
  );
};

export default Referrals;