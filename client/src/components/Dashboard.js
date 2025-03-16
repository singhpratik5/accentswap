import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Rating,
  Chip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user data
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError('');

        const config = {
          headers: {
            'Authorization': token
          }
        };

        // Fetch user profile
        const profileRes = await axios.get('/api/auth/me', config);
        setUserProfile(profileRes.data);

        // Fetch feedback statistics
        const statsRes = await axios.get('/api/feedback/stats', config);
        setStats(statsRes.data);

        // Fetch recent feedback
        const feedbackRes = await axios.get('/api/feedback/user', config);
        setFeedback(feedbackRes.data);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        setLoading(false);

        // If unauthorized, redirect to login
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };

    fetchUserData();
  }, [navigate]);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Prepare rating distribution data for chart
  const prepareRatingData = () => {
    if (!stats) return [];

    return Object.entries(stats.ratingDistribution).map(([rating, count]) => ({
      name: `${rating} Star${rating === '1' ? '' : 's'}`,
      value: count
    }));
  };

  // Prepare tag data for chart
  const prepareTagData = () => {
    if (!stats || !stats.topTags) return [];

    return stats.topTags.map(tag => ({
      name: tag.tag,
      value: tag.count
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading your dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Your Language Learning Dashboard
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* User Profile Summary */}
        {userProfile && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>Profile Summary</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Languages</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body1">
                      <strong>Speaks:</strong> {userProfile.preferredLanguage}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Learning:</strong> {userProfile.learningLanguages?.join(', ') || 'None specified'}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Proficiency:</strong> {userProfile.proficiencyLevel}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Interests</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {userProfile.interests?.length > 0 ? (
                        userProfile.interests.map((interest) => (
                          <Chip key={interest} label={interest} color="primary" variant="outlined" />
                        ))
                      ) : (
                        <Typography variant="body2">No interests specified</Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Feedback Statistics */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>Conversation Feedback</Typography>
          
          {stats && stats.totalFeedback > 0 ? (
            <Grid container spacing={3}>
              {/* Overall Rating */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>Overall Rating</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                      <Typography variant="h3" color="primary" sx={{ mr: 1 }}>
                        {stats.averageRating}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        /5
                      </Typography>
                    </Box>
                    <Rating value={parseFloat(stats.averageRating)} precision={0.1} readOnly size="large" />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Based on {stats.totalFeedback} conversation{stats.totalFeedback !== 1 ? 's' : ''}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Rating Distribution */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom align="center">Rating Distribution</Typography>
                    <Box sx={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={prepareRatingData()} layout="vertical">
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Top Tags */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom align="center">What People Say About You</Typography>
                    {stats.topTags && stats.topTags.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, my: 2 }}>
                          {stats.topTags.map((tag) => (
                            <Chip 
                              key={tag.tag} 
                              label={`${tag.tag} (${tag.count})`} 
                              color="primary" 
                              variant="outlined" 
                            />
                          ))}
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                        No tags received yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>No Feedback Yet</Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  You haven't received any feedback from your conversations yet.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/video-chat')}
                >
                  Start a Conversation
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Recent Feedback */}
        <Box>
          <Typography variant="h5" gutterBottom>Recent Feedback</Typography>
          
          {feedback && feedback.length > 0 ? (
            <List>
              {feedback.slice(0, 5).map((item) => (
                <Paper key={item._id} sx={{ mb: 2, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">
                      From: {item.userId?.name || 'Anonymous'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(item.createdAt)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Rating value={item.overallRating} readOnly size="small" />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      ({item.overallRating}/5)
                    </Typography>
                  </Box>
                  
                  {item.tags && item.tags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {item.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                  
                  {item.comments && (
                    <Typography variant="body2">
                      "{item.comments}"
                    </Typography>
                  )}
                </Paper>
              ))}
            </List>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No feedback received yet.
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard;