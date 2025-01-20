# Use an official Node runtime as a parent image
FROM node:22

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY app/package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the current directory contents into the container at /app
COPY app/ .

RUN env

# Define build-time arguments
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN env | grep REACT > .env

# Build the app for production
RUN npm run build

# Install serve to run the application
RUN npm install -g serve

# # Make port 3000 available to the world outside this container
EXPOSE 3000

# # Serve the app
CMD serve -s build -l 3000
