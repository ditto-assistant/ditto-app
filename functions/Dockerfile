# set which open source docker image to use as a base
FROM node:18

# Set the working directory in the container
WORKDIR /openai-chat

# Copy the current directory contents into the container at /app
COPY . /openai-chat

# Install any needed packages specified in requirements.txt
RUN yarn install

# Make port 5001 available to the world outside this container
EXPOSE 5001

# Run "node server.js" when the container launches
CMD ["node", "index.js"]