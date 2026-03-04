# Use official Node image
FROM node:20-alpine

# Create app directory inside container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Only install production packages skip the dev dependencies 
RUN npm ci --only=production

# Copy remaining files
COPY . .

# Expose port
EXPOSE 8003

# Start the app
CMD ["node", "src/server.js"]