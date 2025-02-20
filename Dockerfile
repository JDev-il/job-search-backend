# Use ARM64 variant if running on Apple Silicon (M1/M2 Macs)
FROM --platform=linux/arm64 node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Install system dependencies required for bcrypt
RUN apk add --no-cache python3 make g++

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies inside Docker (Linux)
RUN npm install --production

# Reinstall bcrypt inside the container (to match Linux environment)
RUN npm rebuild bcrypt --build-from-source

# Copy the rest of the app
COPY . .

# Build the NestJS app
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]