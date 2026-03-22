# key-light-homekit

Exposes an Elgato Key Light to Apple HomeKit. Controls on/off, brightness, and color temperature.

## Setup

1. Set your Key Light's IP in `docker-compose.yml`
2. Deploy:
   ```
   docker compose up -d --build
   ```
3. Open the Home app, tap **+** > **Add Accessory**, enter PIN: **031-45-154**

## How it works

Uses [hap-nodejs](https://github.com/homebridge/HAP-NodeJS) to create a HomeKit Lightbulb accessory that proxies commands to the Key Light's local HTTP API (`http://<ip>:9123/elgato/lights`). Polls every 5 seconds to sync changes made via the Elgato app.

## Requirements

- Docker with host networking (required for mDNS/Bonjour discovery)
- Key Light on the same network

## Notes

- Pairing data persists in `./persist/` — survives container restarts without re-pairing
- To re-pair: `rm -rf persist` and restart
- Logs show `[homekit]` for changes from HomeKit and `[light]` for changes detected on the light itself
