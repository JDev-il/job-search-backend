import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TestingService {
  async testProtectedRoute() {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Impkd29yazIwMjFAZ21haWwuY29tIiwibmFtZSI6IkpvbmF0aGFuIERhbmllbCIsImlhdCI6MTczNjY5MzMxMCwiZXhwIjoxNzM2Nzc5NzEwfQ.lDbRleZa5amf94kUZWu940MFkhVXfFrzzj0dJnV-HNc';
    try {
      const response = await axios.get('http://localhost:3000/protected', {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });
    } catch (error) {
      console.error('Error accessing protected route:', error.response?.data || error.message);
    }
  }
}