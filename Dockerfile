# Dockerfile for Wingo Panel
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies (production)
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port
EXPOSE 4000

# Start the app
CMD ["node", "index.js"]
