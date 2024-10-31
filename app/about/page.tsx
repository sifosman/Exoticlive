import { Container, Typography, Box, Grid, Paper } from '@mui/material';

export default function AboutPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom
        sx={{
          fontFamily: 'Lato, sans-serif',
          textAlign: 'center',
          mt: 4 // Adjust this value to move the heading slightly down
        }}
      >
        About Us
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography 
              variant="body1" 
              paragraph
              sx={{ fontFamily: 'Lato, sans-serif' }}
            >
              Welcome to Wholesale Ladies Shoes and Clothing, your premier destination for high-quality wholesale footwear and apparel. 
              Based in KZN, we have been in operation for the past 20 years, supplying happy customers by building long-lasting relationships and providing great service and value for money.
            </Typography>
            <Typography 
              variant="body1" 
              paragraph
              sx={{ fontFamily: 'Lato, sans-serif' }}
            >
              Our mission is to offer a wide range of stylish and comfortable shoes and clothing for retailers and businesses worldwide. 
              We pride ourselves on our commitment to quality and customer satisfaction.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box
            component="img"
            sx={{
              width: '100%',
              height: 'auto',
              borderRadius: 2,
            }}
            alt="Banner"
            src="/about.webp"
          />
        </Grid>
      </Grid>
    </Container>
  );
}