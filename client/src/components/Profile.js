import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormHelperText
} from '@mui/material';

const Profile = () => {
  const [formData, setFormData] = useState({
    name: '',
    preferredLanguage: 'English',
    learningLanguages: [],
    proficiencyLevel: 'Beginner',
    interests: [],
    ageRange: '18-25'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { name, preferredLanguage, learningLanguages, proficiencyLevel, interests, ageRange } = formData;

  // Language options
  const languages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Russian', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi'
  ];

  // Interest options
  const interestOptions = [
    'Music', 'Movies', 'Books', 'Sports', 'Travel', 'Food', 'Technology',
    'Art', 'Photography', 'Gaming', 'Science', 'History', 'Politics', 'Fashion'
  ];

  // Age range options
  const ageRanges = ['18-25', '26-35', '36-45', '46-55', '56+'];

  // Proficiency level options
  const proficiencyLevels = ['Beginner', 'Intermediate', 'Advanced', 'Fluent'];

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch user profile data
    const fetchUserProfile = async () => {
      try {
        const config = {
          headers: {
            'Authorization': token
          }
        };

        const res = await axios.get('/api/auth/me', config);
        
        setFormData({
          name: res.data.name || '',
          preferredLanguage: res.data.preferredLanguage || 'English',
          learningLanguages: res.data.learningLanguages || [],
          proficiencyLevel: res.data.proficiencyLevel || 'Beginner',
          interests: res.data.interests || [],
          ageRange: res.data.ageRange || '18-25'
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile. Please try again.');
        setLoading(false);
        // If unauthorized, redirect to login
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMultiSelectChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': token
        }
      };
      
      await axios.put('/api/users/profile', formData, config);
      
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update profile. Please try again.');
      
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
          <Typography>Loading profile...</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Your Profile
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box component="form" onSubmit={onSubmit}>
          <TextField
            label="Name"
            type="text"
            name="name"
            value={name}
            onChange={onChange}
            required
            fullWidth
            margin="normal"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="preferred-language-label">Preferred Language</InputLabel>
            <Select
              labelId="preferred-language-label"
              name="preferredLanguage"
              value={preferredLanguage}
              onChange={onChange}
              label="Preferred Language"
            >
              {languages.map((language) => (
                <MenuItem key={language} value={language}>
                  {language}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>The language you speak fluently</FormHelperText>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="learning-languages-label">Learning Languages</InputLabel>
            <Select
              labelId="learning-languages-label"
              multiple
              value={learningLanguages}
              onChange={(e) => handleMultiSelectChange(e, 'learningLanguages')}
              input={<OutlinedInput label="Learning Languages" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {languages.map((language) => (
                <MenuItem key={language} value={language}>
                  {language}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Languages you want to practice</FormHelperText>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="proficiency-level-label">Proficiency Level</InputLabel>
            <Select
              labelId="proficiency-level-label"
              name="proficiencyLevel"
              value={proficiencyLevel}
              onChange={onChange}
              label="Proficiency Level"
            >
              {proficiencyLevels.map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Your level in the languages you're learning</FormHelperText>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="interests-label">Interests</InputLabel>
            <Select
              labelId="interests-label"
              multiple
              value={interests}
              onChange={(e) => handleMultiSelectChange(e, 'interests')}
              input={<OutlinedInput label="Interests" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {interestOptions.map((interest) => (
                <MenuItem key={interest} value={interest}>
                  {interest}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Topics you enjoy talking about</FormHelperText>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="age-range-label">Age Range</InputLabel>
            <Select
              labelId="age-range-label"
              name="ageRange"
              value={ageRange}
              onChange={onChange}
              label="Age Range"
            >
              {ageRanges.map((range) => (
                <MenuItem key={range} value={range}>
                  {range}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
          >
            Update Profile
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;