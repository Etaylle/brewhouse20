#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB and enable it to start on boot
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone the repository
git clone https://github.com/Etaylle/brewhouse-dashboard.git

cd brewhouse-dashboard

# Install dependencies
npm install

# Create environment file
echo "MONGO_URI=mongodb://localhost:27017/brewhouse" > .env
echo "NODE_ENV=production" >> .env
echo "PORT=3000" >> .env

# Seed the database
npm run seed

# Build the frontend
npm run build

# Start the application in production mode
npm start
