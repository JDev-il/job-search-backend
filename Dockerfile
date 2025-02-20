# Use Node.js 18 as base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Install system dependencies required for bcrypt
RUN apk add --no-cache python3 make g++ 

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Build the NestJS app
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]