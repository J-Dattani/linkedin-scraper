# Use a Node.js 18 base image that includes browser dependencies
FROM mcr.microsoft.com/playwright/javascript:v1.39.0-jammy

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 10000

# Define the command to run the app
CMD ["npm", "start"]
