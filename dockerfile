# FROM node:lts-alpine

# WORKDIR /app

# RUN apk update && apk add --no-cache nmap && \
#     echo @edge https://dl-cdn.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
#     echo @edge https://dl-cdn.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
#     apk update && \
#     apk add --no-cache \
#       chromium \
#       harfbuzz \
#       "freetype>2.8" \
#       ttf-freefont \
#       nss

# # Set environment variable to use system Chromium
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
#     PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser


# COPY . /app

# RUN npm install

# EXPOSE 3000

# CMD ["npm", "start"]



FROM node:lts-alpine

WORKDIR /app

# Install only essential dependencies for Puppeteer/Chromium
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production && npm cache clean --force

# Copy the app code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]