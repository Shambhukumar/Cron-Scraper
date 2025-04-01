FROM node:18-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxfixes3 \      # Explicitly add libXfixes.so.3
    libx11-6 \        # Additional X11 dependency
    libxi6 \          # Input handling
    libxtst6 \        # X11 testing utilities
    fonts-liberation \ # Fonts for rendering
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["npm", "start"]