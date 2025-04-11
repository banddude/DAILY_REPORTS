#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
SERVER_DIR="server"
MOBILE_APP_DIR="mobile-app"
SERVER_PORT=3000
EXPO_PORT=8081 # Metro Bundler port
EXPO_ALT_PORT=19000 # Expo Go connection port

# --- Helper Function to Kill Process by Port ---
kill_process_on_port() {
  PORT=$1
  echo "Checking for process on port $PORT..."
  # Use lsof -t to get only the PID, suppress errors if no process found
  # The command substitution might return multiple lines/PIDs
  PIDS=$(lsof -t -i :"$PORT" 2>/dev/null || true)

  if [ -n "$PIDS" ]; then
    # Loop through each PID found (one per line)
    echo "Found process(es) on port $PORT: $PIDS"
    for PID in $PIDS; do
      echo "Killing PID: $PID..."
      # Use kill -9 for forceful termination
      kill -9 "$PID" || echo "Failed to kill process $PID (maybe already terminated?)"
    done
    # Small delay to allow the port to be released
    sleep 1 
  else
    echo "No process found on port $PORT."
  fi
}

# --- Kill Existing Processes ---
kill_process_on_port $SERVER_PORT
kill_process_on_port $EXPO_PORT
kill_process_on_port $EXPO_ALT_PORT 
# Add any other ports Expo might use if necessary (e.g., 19001, 19002)

# --- Start Server ---
echo "--- Starting Backend Server ---"
cd "$SERVER_DIR" || { echo "Error: Directory $SERVER_DIR not found!"; exit 1; }

echo "Installing server dependencies (if needed)..."
npm install

echo "Building server..."
npm run build

echo "Starting server in background (logs to server/server.log)..."
# Redirect stdout and stderr to server.log, then run in background
npm start > server.log 2>&1 &
SERVER_PID=$! # Store the PID of the background server process
echo "Server started in background (PID: $SERVER_PID)."

# Go back to root before changing to mobile app dir
cd .. 

# --- Start Mobile App ---
echo "--- Starting Mobile App (Expo) ---"
cd "$MOBILE_APP_DIR" || { echo "Error: Directory $MOBILE_APP_DIR not found!"; exit 1; }

echo "Installing mobile app dependencies (if needed)..."
npm install

echo "Starting Expo development server (foreground) with cache clearing..."
# Add --clear flag to reset cache
npm start -- --clear 

# Note: When you stop the Expo process (Ctrl+C), 
# the background server process might still be running.
# You might need to kill it manually using 'kill $SERVER_PID' or by port.
# More advanced scripts could use 'trap' to automatically kill the server on exit.

echo "Expo server stopped." 