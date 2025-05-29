// API Service for DocGuard

// Use your computer's IP address here
// To find it: 
// Mac: System Preferences > Network > Your IP
// Windows: ipconfig in command prompt
const API_BASE_URL = 'http://192.168.1.53:8000'; // Example: http://192.168.1.100:8000

export const analyzeReceipt = async (imageUri) => {
  try {
    // Create form data
    const formData = new FormData();
    
    // Prepare the image
    const imageData = {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    };
    
    formData.append('file', imageData);
    
    // For testing, use the test endpoint first
    // const response = await fetch(`${API_BASE_URL}/test-receipt`, {
    // method: 'POST',
    // });

    const response = await fetch(`${API_BASE_URL}/analyze-receipt`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const result = await response.json();
    return result;
    
    /* 
    // When ready for real AI analysis, use this instead:
    const response = await fetch(`${API_BASE_URL}/analyze-receipt`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    */
    
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};