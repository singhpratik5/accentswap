import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Rating,
  TextField,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Alert
} from '@mui/material';

const FeedbackForm = ({ open, onClose, matchInfo }) => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [helpfulnessRating, setHelpfulnessRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Feedback tags
  const feedbackTags = [
    'Helpful', 'Patient', 'Knowledgeable', 'Friendly',
    'Good pronunciation', 'Clear speech', 'Good listener',
    'Engaging conversation', 'Cultural insights'
  ];

  // Handle tag selection
  const handleTagClick = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Submit feedback
  const handleSubmit = async () => {
    try {
      setError('');
      
      if (rating === 0) {
        setError('Please provide an overall rating');
        return;
      }
      
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': token
        }
      };
      
      const feedbackData = {
        matchId: matchInfo?.matchId,
        partnerId: matchInfo?.partnerId,
        overallRating: rating,
        helpfulnessRating,
        connectionQuality,
        tags: selectedTags,
        comments: feedbackText
      };
      
      await axios.post('/api/feedback/submit', feedbackData, config);
      
      setSuccess(true);
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to submit feedback. Please try again.');
    }
  };

  // Skip feedback
  const handleSkip = () => {
    onClose();
    navigate('/');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div" align="center">
          How was your conversation?
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Feedback submitted successfully!</Alert>}
        
        <Box sx={{ my: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="legend">Overall Experience</Typography>
          <Rating
            name="overall-rating"
            value={rating}
            onChange={(event, newValue) => setRating(newValue)}
            size="large"
            sx={{ fontSize: '2rem', my: 1 }}
          />
        </Box>
        
        <Box sx={{ my: 2, display: 'flex', flexDirection: 'column' }}>
          <Typography component="legend" gutterBottom>How helpful was your partner?</Typography>
          <Rating
            name="helpfulness-rating"
            value={helpfulnessRating}
            onChange={(event, newValue) => setHelpfulnessRating(newValue)}
            size="medium"
            sx={{ mb: 2 }}
          />
        </Box>
        
        <FormControl component="fieldset" sx={{ my: 2 }}>
          <FormLabel component="legend">Connection Quality</FormLabel>
          <RadioGroup
            row
            name="connection-quality"
            value={connectionQuality}
            onChange={(e) => setConnectionQuality(e.target.value)}
          >
            <FormControlLabel value="excellent" control={<Radio />} label="Excellent" />
            <FormControlLabel value="good" control={<Radio />} label="Good" />
            <FormControlLabel value="fair" control={<Radio />} label="Fair" />
            <FormControlLabel value="poor" control={<Radio />} label="Poor" />
          </RadioGroup>
        </FormControl>
        
        <Box sx={{ my: 2 }}>
          <Typography component="legend" gutterBottom>What did you like about your partner?</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 1 }}>
            {feedbackTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onClick={() => handleTagClick(tag)}
                color={selectedTags.includes(tag) ? "primary" : "default"}
                variant={selectedTags.includes(tag) ? "filled" : "outlined"}
                sx={{ m: 0.5 }}
              />
            ))}
          </Box>
        </Box>
        
        <TextField
          label="Additional Comments"
          multiline
          rows={4}
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="Share your thoughts about the conversation..."
        />
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
        <Button onClick={handleSkip} color="inherit">
          Skip
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Submit Feedback
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackForm;