FROM node:20-alpine

WORKDIR /app

# Set PORT env for Next.js
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
