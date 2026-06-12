#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <driver/twai.h>
#include <Preferences.h>
#include <map>
#include <vector>
#include <algorithm>

// ===================== 引脚 =====================
#define NUM_LEDS 10
#define LED_PIN 3
#define BTN_PIN 8
#define CAN_TX 7
#define CAN_RX 6
#define OLED_SCL 9
#define OLED_SDA 10

#define SCREEN_W 128
#define SCREEN_H 64
#define CAN_BITRATE TWAI_TIMING_CONFIG_500KBITS()

static const char *BLE_NAME = "MT-CAN-Learn";
static const char *NUS_SERVICE = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
static const char *NUS_RX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
static const char *NUS_TX = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

enum LearnStep { STEP_IDLE = 0, STEP_A, STEP_B, STEP_C, STEP_D };
enum DeviceMode { MODE_IDLE = 0, MODE_LEARNING, MODE_RUNTIME };

struct FrameState {
  uint8_t data[8]{};
  uint8_t noise[8]{};
  bool seen = false;
};

struct PairDelta {
  uint16_t minVal = 0xFFFF;
  uint16_t maxVal = 0;
  uint16_t lastVal = 0;
  bool seen = false;
};

struct RuntimeConfig {
  bool valid = false;
  uint32_t gearId = 0;
  uint8_t gearOffset = 0;
  uint8_t gearNeutral = 0;
  uint8_t gearOne = 0;
  uint32_t rpmId = 0;
  uint8_t rpmPairOffset = 0;
  uint16_t rpmMax = 8000;
  float rpmScale = 1.0f;
};

Adafruit_SSD1306 display(SCREEN_W, SCREEN_H, &Wire, -1);
Preferences prefs;
NimBLECharacteristic *txChar = nullptr;
volatile bool bleConnected = false;

DeviceMode deviceMode = MODE_IDLE;
LearnStep learnStep = STEP_IDLE;
uint32_t learnStartMs = 0;
static const uint32_t LEARN_ABC_MS = 2000;
static const uint32_t LEARN_D_MAX_MS = 30000;

std::map<uint32_t, FrameState> frameMap;
std::map<uint32_t, PairDelta[7]> deltaMap;

RuntimeConfig runtimeCfg;
uint32_t lastRuntimeNotifyMs = 0;
uint32_t lastCanFrameMs = 0;
uint32_t canFrameCount = 0;

String rxBuffer;

// ===================== 工具 =====================
static uint16_t readU16BE(const uint8_t *d, uint8_t off) {
  if (off > 6) return 0;
  return (uint16_t(d[off]) << 8) | d[off + 1];
}

static uint16_t readU16LE(const uint8_t *d, uint8_t off) {
  if (off > 6) return 0;
  return (uint16_t(d[off + 1]) << 8) | d[off];
}

static void markNoise(FrameState &st, const uint8_t *prev, const uint8_t *next) {
  for (int i = 0; i < 8; i++) {
    if (prev[i] != next[i]) {
      st.noise[i] |= (prev[i] ^ next[i]);
    }
  }
}

static void bleSend(const String &msg) {
  if (!bleConnected || !txChar) return;
  txChar->setValue((uint8_t *)msg.c_str(), msg.length());
  txChar->notify();
  delay(5);
}

static void bleSendJson(JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  bleSend(out + "\n");
}

static void oledLine(uint8_t line, const String &text) {
  display.setCursor(0, line * 10);
  display.print(text.substring(0, 21));
}

static void refreshOled() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  oledLine(0, String("MT-CAN-Learn"));
  if (deviceMode == MODE_LEARNING) {
    const char *stepName = "?";
    if (learnStep == STEP_A) stepName = "A Neutral";
    else if (learnStep == STEP_B) stepName = "B Gear1";
    else if (learnStep == STEP_C) stepName = "C Neutral";
    else if (learnStep == STEP_D) stepName = "D RevUp";
    oledLine(1, String("Learn ") + stepName);
    oledLine(2, String("IDs:") + frameMap.size());
    oledLine(3, String("CAN fps~") + canFrameCount);
  } else if (deviceMode == MODE_RUNTIME && runtimeCfg.valid) {
    oledLine(1, "Runtime");
    oledLine(2, String("CAN ok"));
    oledLine(3, String("IDs trk ") + frameMap.size());
  } else {
    oledLine(1, bleConnected ? "BLE linked" : "BLE wait...");
    oledLine(2, String("CAN rx:") + canFrameCount);
    oledLine(3, "Btn=step/help");
  }
  display.display();
}

// ===================== CAN =====================
static bool initCan() {
  twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)CAN_TX, (gpio_num_t)CAN_RX, TWAI_MODE_NORMAL);
  twai_timing_config_t t_config = CAN_BITRATE;
  twai_filter_config_t f_config = TWAI_FILTER_CONFIG_ACCEPT_ALL();
  if (twai_driver_install(&g_config, &t_config, &f_config) != ESP_OK) return false;
  if (twai_start() != ESP_OK) return false;
  return true;
}

static void ingestCanFrame(uint32_t id, const uint8_t *data, uint8_t len) {
  canFrameCount++;
  lastCanFrameMs = millis();
  FrameState &st = frameMap[id];
  uint8_t prev[8];
  memcpy(prev, st.data, 8);
  memset(st.data, 0, 8);
  uint8_t copyLen = std::min<uint8_t>(len, 8);
  memcpy(st.data, data, copyLen);
  st.seen = true;
  markNoise(st, prev, st.data);

  if (deviceMode == MODE_LEARNING && learnStep == STEP_D) {
    PairDelta *pairs = deltaMap[id];
    for (uint8_t off = 0; off < 7; off++) {
      uint16_t le = readU16LE(st.data, off);
      uint16_t be = readU16BE(st.data, off);
      PairDelta &pl = pairs[off];
      PairDelta &pb = pairs[off]; // use LE primary; BE tracked via offset+100 in map key alternative
      if (!pl.seen) {
        pl.minVal = le;
        pl.maxVal = le;
        pl.lastVal = le;
        pl.seen = true;
      } else {
        pl.minVal = std::min(pl.minVal, le);
        pl.maxVal = std::max(pl.maxVal, le);
        pl.lastVal = le;
      }
      (void)be;
      (void)pb;
    }
  }

  if (deviceMode == MODE_RUNTIME && runtimeCfg.valid) {
    // runtime notify throttled in loop
  }
}

static void pollCan() {
  twai_message_t msg;
  while (twai_receive(&msg, 0) == ESP_OK) {
    uint32_t id = msg.identifier & 0x1FFFFFFF;
    ingestCanFrame(id, msg.data, msg.data_length_code);
  }
}

// ===================== 学习 =====================
static void resetLearnBuffers() {
  frameMap.clear();
  deltaMap.clear();
  canFrameCount = 0;
}

static void beginLearnStep(LearnStep step) {
  resetLearnBuffers();
  deviceMode = MODE_LEARNING;
  learnStep = step;
  learnStartMs = millis();
  JsonDocument doc;
  doc["type"] = "learn_started";
  doc["step"] = step == STEP_A ? "A" : step == STEP_B ? "B" : step == STEP_C ? "C" : "D";
  bleSendJson(doc);
}

static void sendSnapshotFrames(const char *stepLabel) {
  JsonDocument head;
  head["type"] = "step_done";
  head["step"] = stepLabel;
  head["count"] = frameMap.size();
  bleSendJson(head);

  JsonDocument batch;
  batch["type"] = "snap_batch";
  batch["step"] = stepLabel;
  JsonArray arr = batch["frames"].to<JsonArray>();
  uint8_t batchCount = 0;
  for (auto &kv : frameMap) {
    JsonObject f = arr.add<JsonObject>();
    f["id"] = kv.first;
    JsonArray data = f["data"].to<JsonArray>();
    JsonArray noise = f["noise"].to<JsonArray>();
    for (int i = 0; i < 8; i++) {
      data.add(kv.second.data[i]);
      noise.add(kv.second.noise[i]);
    }
    batchCount++;
    if (batchCount >= 12) {
      bleSendJson(batch);
      arr.clear();
      batchCount = 0;
    }
  }
  if (batchCount > 0) bleSendJson(batch);
}

static void finishLearnStep() {
  if (learnStep == STEP_A) sendSnapshotFrames("A");
  else if (learnStep == STEP_B) sendSnapshotFrames("B");
  else if (learnStep == STEP_C) sendSnapshotFrames("C");
  else if (learnStep == STEP_D) {
    JsonDocument doc;
    doc["type"] = "step_done";
    doc["step"] = "D";
    JsonObject deltas = doc["deltas"].to<JsonObject>();
    for (auto &kv : deltaMap) {
      JsonObject idObj = deltas[String(kv.first)].to<JsonObject>();
      for (uint8_t off = 0; off < 7; off++) {
        if (!kv.second[off].seen) continue;
        uint16_t delta = kv.second[off].maxVal - kv.second[off].minVal;
        JsonObject p = idObj[String(off)].to<JsonObject>();
        p["min"] = kv.second[off].minVal;
        p["max"] = kv.second[off].maxVal;
        p["delta"] = delta;
      }
    }
    bleSendJson(doc);
  }
  deviceMode = MODE_IDLE;
  learnStep = STEP_IDLE;
}

static void tickLearning() {
  if (deviceMode != MODE_LEARNING) return;
  if (learnStep == STEP_D) {
    if (millis() - learnStartMs > LEARN_D_MAX_MS) finishLearnStep();
    return;
  }
  if (millis() - learnStartMs >= LEARN_ABC_MS) finishLearnStep();
}

// ===================== Runtime =====================
static void saveRuntimeConfig() {
  prefs.begin("canlearn", false);
  prefs.putBool("valid", runtimeCfg.valid);
  prefs.putUInt("gearId", runtimeCfg.gearId);
  prefs.putUChar("gearOff", runtimeCfg.gearOffset);
  prefs.putUChar("gearN", runtimeCfg.gearNeutral);
  prefs.putUChar("gear1", runtimeCfg.gearOne);
  prefs.putUInt("rpmId", runtimeCfg.rpmId);
  prefs.putUChar("rpmOff", runtimeCfg.rpmPairOffset);
  prefs.putUInt("rpmMax", runtimeCfg.rpmMax);
  prefs.end();
}

static void loadRuntimeConfig() {
  prefs.begin("canlearn", true);
  runtimeCfg.valid = prefs.getBool("valid", false);
  runtimeCfg.gearId = prefs.getUInt("gearId", 0);
  runtimeCfg.gearOffset = prefs.getUChar("gearOff", 0);
  runtimeCfg.gearNeutral = prefs.getUChar("gearN", 0);
  runtimeCfg.gearOne = prefs.getUChar("gear1", 0);
  runtimeCfg.rpmId = prefs.getUInt("rpmId", 0);
  runtimeCfg.rpmPairOffset = prefs.getUChar("rpmOff", 0);
  runtimeCfg.rpmMax = prefs.getUInt("rpmMax", 8000);
  prefs.end();
}

static int decodeGear(const uint8_t *data) {
  uint8_t v = data[runtimeCfg.gearOffset];
  if (v == runtimeCfg.gearNeutral) return 0;
  if (v == runtimeCfg.gearOne) return 1;
  return -1;
}

static uint16_t decodeRpmRaw(const uint8_t *data) {
  return readU16LE(data, runtimeCfg.rpmPairOffset);
}

static void notifyRuntime() {
  auto it = frameMap.find(runtimeCfg.gearId);
  auto ir = frameMap.find(runtimeCfg.rpmId);
  if (it == frameMap.end() && ir == frameMap.end()) return;

  int gear = -1;
  uint16_t rpmRaw = 0;
  if (it != frameMap.end()) gear = decodeGear(it->second.data);
  if (ir != frameMap.end()) rpmRaw = decodeRpmRaw(ir->second.data);

  float rpm = rpmRaw * runtimeCfg.rpmScale;
  if (rpm > runtimeCfg.rpmMax) rpm = runtimeCfg.rpmMax;

  JsonDocument doc;
  doc["type"] = "runtime";
  doc["gear"] = gear;
  doc["gearLabel"] = gear == 0 ? "N" : gear == 1 ? "1" : "?";
  doc["rpm"] = (uint16_t)rpm;
  doc["rpmRaw"] = rpmRaw;
  bleSendJson(doc);
}

// ===================== BLE 命令 =====================
static void handleCommand(const String &line) {
  JsonDocument doc;
  if (deserializeJson(doc, line)) return;
  const char *cmd = doc["cmd"] | "";
  if (strcmp(cmd, "ping") == 0) {
    JsonDocument pong;
    pong["type"] = "pong";
    bleSendJson(pong);
    return;
  }
  if (strcmp(cmd, "start_learn") == 0) {
    const char *step = doc["step"] | "A";
    if (strcmp(step, "A") == 0) beginLearnStep(STEP_A);
    else if (strcmp(step, "B") == 0) beginLearnStep(STEP_B);
    else if (strcmp(step, "C") == 0) beginLearnStep(STEP_C);
    else if (strcmp(step, "D") == 0) beginLearnStep(STEP_D);
    return;
  }
  if (strcmp(cmd, "stop_learn") == 0) {
    if (deviceMode == MODE_LEARNING) finishLearnStep();
    return;
  }
  if (strcmp(cmd, "set_runtime") == 0) {
    runtimeCfg.valid = true;
    runtimeCfg.gearId = doc["gear_id"] | 0u;
    runtimeCfg.gearOffset = doc["gear_offset"] | 0;
    runtimeCfg.gearNeutral = doc["gear_neutral"] | 0;
    runtimeCfg.gearOne = doc["gear_one"] | 0;
    runtimeCfg.rpmId = doc["rpm_id"] | 0u;
    runtimeCfg.rpmPairOffset = doc["rpm_pair_offset"] | 0;
    runtimeCfg.rpmMax = doc["rpm_max"] | 8000;
    float rpmMaxRaw = doc["rpm_raw_max"] | 0;
    if (rpmMaxRaw > 0) runtimeCfg.rpmScale = runtimeCfg.rpmMax / rpmMaxRaw;
    else runtimeCfg.rpmScale = 1.0f;
    saveRuntimeConfig();
    deviceMode = MODE_RUNTIME;
    JsonDocument ack;
    ack["type"] = "runtime_configured";
    ack["ok"] = true;
    bleSendJson(ack);
    return;
  }
  if (strcmp(cmd, "stop_runtime") == 0) {
    deviceMode = MODE_IDLE;
    JsonDocument ack;
    ack["type"] = "runtime_stopped";
    bleSendJson(ack);
  }
}

class RxCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic *pCharacteristic) {
    std::string v = pCharacteristic->getValue();
    for (char c : v) {
      if (c == '\n') {
        if (rxBuffer.length()) {
          handleCommand(rxBuffer);
          rxBuffer = "";
        }
      } else if (rxBuffer.length() < 1024) {
        rxBuffer += c;
      }
    }
  }
};

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *pServer) {
    bleConnected = true;
    NimBLEDevice::startAdvertising();
  }
  void onDisconnect(NimBLEServer *pServer) {
    bleConnected = false;
    NimBLEDevice::startAdvertising();
  }
};

static void initBle() {
  NimBLEDevice::init(BLE_NAME);
  NimBLEServer *server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  NimBLEService *svc = server->createService(NUS_SERVICE);
  NimBLECharacteristic *rx = svc->createCharacteristic(NUS_RX, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  rx->setCallbacks(new RxCallbacks());
  txChar = svc->createCharacteristic(NUS_TX, NIMBLE_PROPERTY::NOTIFY);
  svc->start();
  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(NUS_SERVICE);
  adv->start();
}

static void initOled() {
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED init failed");
    return;
  }
  display.clearDisplay();
  display.display();
}

static void initButton() {
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
}

void setup() {
  Serial.begin(115200);
  initButton();
  initOled();
  initCan();
  loadRuntimeConfig();
  initBle();
  if (runtimeCfg.valid) deviceMode = MODE_RUNTIME;
  refreshOled();
}

void loop() {
  pollCan();
  tickLearning();

  static uint32_t lastOledMs = 0;
  if (millis() - lastOledMs > 500) {
    lastOledMs = millis();
    refreshOled();
  }

  if (deviceMode == MODE_RUNTIME && runtimeCfg.valid && bleConnected) {
    if (millis() - lastRuntimeNotifyMs > 200) {
      lastRuntimeNotifyMs = millis();
      notifyRuntime();
    }
  }

  static bool lastBtn = true;
  bool btn = digitalRead(BTN_PIN) == LOW;
  if (btn && !lastBtn) {
    delay(30);
    if (digitalRead(BTN_PIN) == LOW) {
      if (deviceMode == MODE_IDLE) {
        beginLearnStep(STEP_A);
      } else if (deviceMode == MODE_LEARNING && learnStep == STEP_D) {
        finishLearnStep();
      }
    }
  }
  lastBtn = btn;
}
