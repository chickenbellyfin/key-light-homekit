const url = `http://${process.env.KEY_LIGHT_IP}:9123/elgato/lights`;
fetch(url, { signal: AbortSignal.timeout(3000) }).then(() => process.exit(0), () => process.exit(1));
