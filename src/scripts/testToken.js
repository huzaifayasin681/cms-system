const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODhmYzFmM2NjZjk5Y2E4ZDRmYTc5YTMiLCJyb2xlIjoic3VwZXJhZG1pbiIsImVtYWlsIjoiaHV6YWlmYXlhc2luNjgxQGdtYWlsLmNvbSIsImlhdCI6MTc1NDQxODYxMiwiZXhwIjoxNzU1MDIzNDEyfQ.0exGoEpo30bQrcd0-rlkt2SJ1MSLyv_a1ZuJ_wCgz8U';

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token is valid!');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.log('Token is invalid:', error.message);
}