'use client';
import { Skeleton, Box } from '@mui/material';

interface ProductCardSkeletonProps {
  count: number;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ count }) => {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height={300}
        animation="wave"
      />
      <Box sx={{ p: 2 }}>
        <Skeleton animation="wave" height={24} width="80%" sx={{ mb: 1 }} />
        <Skeleton animation="wave" height={24} width="40%" sx={{ mb: 2 }} />
        <Skeleton animation="wave" height={40} width="100%" />
      </Box>
    </Box>
  );
}

export function TextSkeleton() {
  return (
    <Skeleton 
      animation="wave" 
      height={24} 
      width="100%" 
      sx={{ 
        bgcolor: 'rgba(0,0,0,0.1)',
        borderRadius: 1 
      }} 
    />
  );
}

export function ImageSkeleton() {
  return (
    <Skeleton 
      variant="rectangular" 
      width="100%" 
      height="100%" 
      animation="wave"
      sx={{ 
        bgcolor: 'rgba(0,0,0,0.1)',
        borderRadius: 1 
      }} 
    />
  );
}
