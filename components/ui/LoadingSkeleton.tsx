'use client';
import { Skeleton, Box } from '@mui/material';

interface ProductCardSkeletonProps {
  count: number;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ count }) => {
  return (
    <div className="group relative h-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <Box 
        sx={{ 
          position: 'relative',
          width: '100%',
          aspectRatio: '1/1',
          overflow: 'hidden',
          background: 'white',
          padding: '16px'
        }}
      >
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%"
          animation="wave"
          sx={{ transform: 'scale(0.9)' }}
        />
      </Box>
      <div className="p-4">
        <Skeleton animation="wave" height={24} width="80%" sx={{ mb: 1 }} />
        <Skeleton animation="wave" height={24} width="60%" sx={{ mb: 2 }} />
        <div className="flex justify-between items-end">
          <div>
            <Skeleton animation="wave" height={20} width={80} sx={{ mb: 1 }} />
            <Skeleton animation="wave" height={28} width={120} />
          </div>
        </div>
      </div>
    </div>
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
