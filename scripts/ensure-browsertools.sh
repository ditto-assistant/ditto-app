#!/bin/bash
# ensure-browsertools.sh
# Script to check if browsertools server is running and start it if not

BROWSERTOOLS_PORT=3025
SERVER_COMMAND="bunx @agentdeskai/browser-tools-server@latest"

# Function to check if a port is in use
port_in_use() {
  if command -v lsof &> /dev/null; then
    # Check specifically for a process LISTENING on this port
    lsof -i:"$1" -sTCP:LISTEN &> /dev/null
    return $?
  elif command -v nc &> /dev/null; then
    nc -z localhost "$1" &> /dev/null
    return $?
  else
    # Fallback to curl
    curl -s "http://localhost:$1" -m 1 &> /dev/null
    local status=$?
    # curl returns 0 if connection succeeds, 7 if connection refused
    if [ $status -eq 0 ]; then
      return 0
    else
      return 1
    fi
  fi
}

# Check if browsertools server is already running
if port_in_use $BROWSERTOOLS_PORT; then
  echo "✅ Browsertools server is already running on port $BROWSERTOOLS_PORT"
  exit 0
else
  echo "🚀 Starting browsertools server on port $BROWSERTOOLS_PORT..."
  
  # Start the server in the background and disown it
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS needs open to properly background the process
    $SERVER_COMMAND > /dev/null 2>&1 &
  else
    # Linux/other
    nohup $SERVER_COMMAND > /dev/null 2>&1 &
  fi

  # Store the PID
  BROWSERTOOLS_PID=$!
  
  # Wait for the server to start (up to 5 seconds)
  MAX_WAIT=5
  for ((i=1; i<=MAX_WAIT; i++)); do
    if port_in_use $BROWSERTOOLS_PORT; then
      echo "✅ Browsertools server started successfully"
      # Disown the process so it continues running after the script exits
      disown $BROWSERTOOLS_PID 2>/dev/null || true
      exit 0
    fi
    echo "Waiting for server to start... ($i/$MAX_WAIT)"
    sleep 1
  done
  
  echo "❌ Failed to start browsertools server within $MAX_WAIT seconds"
  exit 1
fi