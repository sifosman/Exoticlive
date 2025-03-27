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
              This online shoe business was founded in 2012 by two brothers Faraaz and Sameer, bearing the name “Fashion Flair”
              With a minimal amount of stock and just a few customers, the business gradually expanded and the foundation of “Exotic Shoes” was finally established.
            </Typography>
            <Typography 
              variant="body1" 
              paragraph
              sx={{ fontFamily: 'Lato, sans-serif' }}
            >
              Over the years we have become well known and service a (both wholesale and retail) customer base nationwide
              In 2021 we were finally ready to upgrade our website www.exoticshoes.co.za to a fully-fledged online store where customers can now easily make purchases with even more convenience!
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