#!/bin/sh

# Initialize data directory with default config if it doesn't exist
if [ ! -f /app/data/config.json ]; then
  echo "Creating default configuration file..."
  cat > /app/data/config.json << EOF
{
  "testers": [
    {
      "id": "ist13",
      "display_name": "IST13",
      "url": "http://192.168.140.114:8080"
    }
  ],
  "displaySettings": {
    "testersPerRow": 3,
    "refreshInterval": 15
  }
}
EOF
  echo "Default configuration created"
else
  echo "Configuration file already exists"
fi

# Ensure proper permissions
chown bun:nodejs /app/data/config.json
chmod 644 /app/data/config.json

echo "Data initialization complete"