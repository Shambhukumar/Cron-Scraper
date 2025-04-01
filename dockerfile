FROM node:18

# Install required dependencies
RUN apt-get update && apt-get install -y wget gnupg

# Install Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
    apt-get update && apt-get install -y google-chrome-stable

# Set the working directory
WORKDIR /app
COPY . .

# Install Node.js dependencies
RUN npm install

# Start the application
CMD ["node", "index.js"]