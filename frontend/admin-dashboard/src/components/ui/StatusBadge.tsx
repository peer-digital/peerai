import React from 'react';
import { Chip, ChipProps, styled } from '@mui/material';

// Status types
export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

// Status colors mapping
const statusColors: Record<StatusType, { bg: string; color: string }> = {
  success: { bg: 'rgba(46, 204, 113, 0.12)', color: 'rgb(30, 132, 73)' },
  warning: { bg: 'rgba(241, 194, 27, 0.12)', color: 'rgb(156, 126, 17)' },
  error: { bg: 'rgba(235, 87, 87, 0.12)', color: 'rgb(185, 28, 28)' },
  info: { bg: 'rgba(33, 150, 243, 0.12)', color: 'rgb(13, 71, 161)' },
  default: { bg: 'rgba(158, 158, 158, 0.12)', color: 'rgb(97, 97, 97)' },
};

// Styled components
const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'statusType',
})<{ statusType: StatusType }>(({ theme, statusType }) => ({
  backgroundColor: statusColors[statusType].bg,
  color: statusColors[statusType].color,
  fontWeight: 500,
  fontSize: '0.75rem',
  height: 24,
  borderRadius: '4px',
  '.MuiChip-label': {
    padding: '0 8px',
  },
  '.MuiChip-icon': {
    color: 'inherit',
    marginLeft: 8,
  },
}));

// Props interface
export interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
  status: StatusType;
  withDot?: boolean;
}

// StatusBadge component
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'default',
  label,
  withDot = true,
  icon,
  ...rest
}) => {
  return (
    <StyledChip
      statusType={status}
      label={label}
      icon={
        withDot && !icon ? (
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: statusColors[status].color,
            }}
          />
        ) : (
          icon || undefined
        )
      }
      {...rest}
    />
  );
};

export default StatusBadge;