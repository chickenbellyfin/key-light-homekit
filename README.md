# key-light-homekit

Exposes an Elgato Key Light to Apple HomeKit. Controls on/off, brightness, and color temperature.

## Setup

1. Create a `docker-compose.yml`:
   ```yaml
   services:
     key-light-homekit:
       image: ghcr.io/chickenbellyfin/key-light-homekit
       network_mode: host
       restart: unless-stopped
       environment:
         - KEY_LIGHT_IP=<your-key-light-ip>
       volumes:
         - ./key-light-homekit:/data
   ```
2. Set `KEY_LIGHT_IP` to your Key Light's IP address
3. Deploy:
   ```
   docker compose up -d
   ```
4. Open the Home app, tap **+** > **Add Accessory**, enter PIN: **031-45-154**

### Build from source

Alternatively, clone this repo and build the image locally:
```
docker compose up -d --build
```

## How it works

Uses [hap-nodejs](https://github.com/homebridge/HAP-NodeJS) to create a HomeKit Lightbulb accessory that proxies commands to the Key Light's local HTTP API (`http://<ip>:9123/elgato/lights`). Polls every 5 seconds to sync changes made via the Elgato app.

## Requirements

- Docker with host networking (required for mDNS/Bonjour discovery)
- Key Light on the same network

## Notes

- Pairing data persists in `./key-light-homekit` — survives container restarts without re-pairing
- To re-pair: `rm -rf ./key-light-homekit` and restart
- Logs show `[homekit]` for changes from HomeKit and `[light]` for changes detected on the light itself


## (publish image)

```
docker buildx build . -t ghcr.io/chickenbellyfin/key-light-homekit:$(git rev-parse --short HEAD) --platform linux/amd64,linux/arm64 --push
docker buildx build . -t ghcr.io/chickenbellyfin/key-light-homekit:latest --platform linux/amd64,linux/arm64 --push
```