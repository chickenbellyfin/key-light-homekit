const {
  Accessory, AccessoryEventTypes, Characteristic, Service,
  CharacteristicEventTypes, Categories, uuid, HAPStorage,
} = require("hap-nodejs");

HAPStorage.setCustomStoragePath("/data");

const KEY_LIGHT_IP = process.env.KEY_LIGHT_IP;
if (!KEY_LIGHT_IP) {
  console.error("ERROR: KEY_LIGHT_IP environment variable is required");
  process.exit(1);
}

const LIGHT_URL = `http://${KEY_LIGHT_IP}:9123/elgato/lights`;
const POLL_INTERVAL = 20000;
const FETCH_TIMEOUT = 5000;
const ELGATO_TEMP_MIN = 143;
const ELGATO_TEMP_MAX = 344;

const state = { on: false, brightness: 50, temperature: 200 };
let lastSetTime = 0;
const SET_COOLDOWN = 30000;

async function getLight() {
  const res = await fetch(LIGHT_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  const { lights } = await res.json();
  state.on = lights[0].on === 1;
  state.brightness = lights[0].brightness;
  state.temperature = lights[0].temperature;
}

async function setLight(props) {
  await fetch(LIGHT_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numberOfLights: 1, lights: [props] }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
}

function log(source, msg) {
  console.log(`[${new Date().toISOString()}] [${source}] ${msg}`);
}

function onSet(props, callback) {
  const desc = Object.entries(props).map(([k, v]) => `${k}=${v}`).join(" ");
  log("homekit", desc);
  lastSetTime = Date.now();
  setLight(props).then(() => callback(), () => callback());
}

// Create accessory
const accessory = new Accessory("Key Light", uuid.generate("elgato-key-light"));

accessory
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Elgato")
  .setCharacteristic(Characteristic.Model, "Key Light")
  .setCharacteristic(Characteristic.SerialNumber, KEY_LIGHT_IP)
  .setCharacteristic(Characteristic.FirmwareRevision, "1.0.0");

const lightService = accessory.addService(Service.Lightbulb, "Key Light");

lightService
  .getCharacteristic(Characteristic.On)
  .on(CharacteristicEventTypes.GET, (callback) => callback(null, state.on))
  .on(CharacteristicEventTypes.SET, (value, callback) => {
    state.on = value;
    onSet({ on: value ? 1 : 0 }, callback);
  });

lightService
  .addCharacteristic(Characteristic.Brightness)
  .on(CharacteristicEventTypes.GET, (callback) => callback(null, state.brightness))
  .on(CharacteristicEventTypes.SET, (value, callback) => {
    state.brightness = value;
    onSet({ brightness: value }, callback);
  });

lightService
  .addCharacteristic(Characteristic.ColorTemperature)
  .setProps({ minValue: ELGATO_TEMP_MIN, maxValue: ELGATO_TEMP_MAX })
  .updateValue(state.temperature)
  .on(CharacteristicEventTypes.GET, (callback) => callback(null, state.temperature))
  .on(CharacteristicEventTypes.SET, (value, callback) => {
    state.temperature = value;
    onSet({ temperature: value }, callback);
  });

accessory.on(AccessoryEventTypes.IDENTIFY, (paired, callback) => {
  log("homekit", `identify (paired: ${paired})`);
  callback();
});

accessory.publish({
  username: "1A:2B:3C:4D:5E:FF",
  pincode: "031-45-154",
  port: 47128,
  category: Categories.LIGHTBULB,
});

console.log("Key Light HomeKit bridge running");
console.log(`Light IP: ${KEY_LIGHT_IP}`);
console.log("PIN: 031-45-154");

// Graceful shutdown — clean up mDNS records
function shutdown() {
  console.log("Shutting down...");
  accessory.unpublish();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

// Poll for external changes (setTimeout loop prevents overlap)
const pollCharacteristics = [
  [Characteristic.On, "on"],
  [Characteristic.Brightness, "brightness"],
  [Characteristic.ColorTemperature, "temperature"],
];

async function poll() {
  if (Date.now() - lastSetTime < SET_COOLDOWN) {
    setTimeout(poll, POLL_INTERVAL);
    return;
  }
  try {
    const prev = { ...state };
    await getLight();
    for (const [char, key] of pollCharacteristics) {
      if (prev[key] !== state[key]) {
        log("light", `${key}: ${prev[key]} -> ${state[key]}`);
        lightService.getCharacteristic(char).updateValue(state[key]);
      }
    }
  } catch {
    // Light unreachable, skip update
  }
  setTimeout(poll, POLL_INTERVAL);
}

setTimeout(poll, POLL_INTERVAL);
