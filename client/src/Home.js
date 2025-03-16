import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper } from '@mui/material';

const Home = () => {
  const isAuthenticated = localStorage.getItem('token') ? true : false;

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to AccentSwap
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          A real-time voice and video calling platform that connects users with random strangers to practice and improve any language through live conversations.
        </Typography>

        <Box sx={{ mt: 4 }}>
          {isAuthenticated ? (
            <Box>
              <Button 
                component={Link} 
                to="/video-chat" 
                variant="contained" 
                color="primary" 
                size="large"
                sx={{ mx: 1 }}
              >
                Start Video Chat
              </Button>
              <Button 
                variant="outlined" 
                color="secondary" 
                size="large"
                onClick={handleLogout}
                sx={{ mx: 1 }}
              >
                Logout
              </Button>
            </Box>
          ) : (
            <Box>
              <Button 
                component={Link} 
                to="/login" 
                variant="contained" 
                color="primary" 
                size="large"
                sx={{ mx: 1 }}
              >
                Login
              </Button>
              <Button 
                component={Link} 
                to="/register" 
                variant="outlined" 
                color="secondary" 
                size="large"
                sx={{ mx: 1 }}
              >
                Register
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Home;