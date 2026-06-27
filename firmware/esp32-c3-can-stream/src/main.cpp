/**
 * MT-CAN-Stream — 纯 CAN 转发固件
 * 不存储、不解析；BLE 持续推送 CAN 帧，供小程序录制上传 COS。
 */
#include <Arduino.h>
#include <U8g2lib.h>
#include <NimBLEDevice.h>
#include <driver/twai.h>

#define CAN_TX 7
#define CAN_RX 6
#define OLED_SCL 9
#define OLED_SDA 10
#define CAN_BITRATE TWAI_TIMING_CONFIG_500KBITS()
#define BLE_CHUNK 200
#define BATCH_FLUSH_MS 80
#define MAX_BATCH_FRAMES 4

static const char *BLE_NAME = "MT-CAN-Learn";
static const char *NUS_SERVICE = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
static const char *NUS_RX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
static const char *NUS_TX = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

U8G2_SSD1306_128X64_NONAME_F_SW_I2C u8g2(U8G2_R0, OLED_SCL, OLED_SDA, U8X8_PIN_NONE);
NimBLECharacteristic *txChar = nullptr;
volatile bool bleConnected = false;
String rxBuffer;

uint32_t canTotalAll = 0;
uint32_t canThisSec = 0;
uint32_t canPerSec = 0;
uint32_t lastSecMs = 0;
uint32_t lastFlushMs = 0;

struct BatchFrame {
  uint32_t id;
  uint8_t dlc;
  uint8_t data[8];
};
BatchFrame batchBuf[MAX_BATCH_FRAMES];
uint8_t batchCount = 0;

static void bleSendRaw(const String &msg) {
  if (!bleConnected || !txChar) return;
  if (msg.length() <= BLE_CHUNK) {
    txChar->setValue((uint8_t *)msg.c_str(), msg.length());
    txChar->notify();
    return;
  }
  for (unsigned i = 0; i < msg.length(); i += BLE_CHUNK) {
    String part = msg.substring(i, i + BLE_CHUNK);
    txChar->setValue((uint8_t *)part.c_str(), part.length());
    txChar->notify();
    delay(6);
  }
}

static void bleSendLine(const String &jsonBody) {
  bleSendRaw(jsonBody + "\n");
}

static bool initCan() {
  twai_general_config_t g = TWAI_GENERAL_CONFIG_DEFAULT((gpio_num_t)CAN_TX, (gpio_num_t)CAN_RX, TWAI_MODE_NORMAL);
  g.rx_queue_len = 64;
  twai_timing_config_t t = CAN_BITRATE;
  twai_filter_config_t f = TWAI_FILTER_CONFIG_ACCEPT_ALL();
  if (twai_driver_install(&g, &t, &f) != ESP_OK) return false;
  return twai_start() == ESP_OK;
}

static void flushBatch() {
  if (!batchCount) return;
  String s = "{\"type\":\"can_batch\",\"frames\":[";
  for (uint8_t i = 0; i < batchCount; i++) {
    if (i) s += ',';
    s += "{\"id\":" + String(batchBuf[i].id) + ",\"dlc\":" + String(batchBuf[i].dlc) + ",\"d\":[";
    for (uint8_t b = 0; b < batchBuf[i].dlc && b < 8; b++) {
      if (b) s += ',';
      s += String(batchBuf[i].data[b]);
    }
    s += "]}";
  }
  s += "]}";
  bleSendLine(s);
  batchCount = 0;
  lastFlushMs = millis();
}

static void pushFrame(uint32_t id, const uint8_t *data, uint8_t dlc) {
  if (batchCount >= MAX_BATCH_FRAMES) flushBatch();
  BatchFrame &f = batchBuf[batchCount++];
  f.id = id;
  f.dlc = dlc > 8 ? 8 : dlc;
  memset(f.data, 0, 8);
  memcpy(f.data, data, f.dlc);
}

static void pollCan() {
  twai_message_t msg;
  for (int n = 0; n < 24; n++) {
    if (twai_receive(&msg, 0) != ESP_OK) break;
    canTotalAll++;
    canThisSec++;
    pushFrame(msg.identifier & 0x1FFFFFFF, msg.data, msg.data_length_code);
  }
}

static void refreshOled() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(0, 10, "MT-CAN-Stream");
  u8g2.drawStr(0, 26, bleConnected ? "BLE: Connected" : "BLE: Waiting...");
  char line[28];
  snprintf(line, sizeof(line), "CAN total:%u", (unsigned)canTotalAll);
  u8g2.drawStr(0, 40, line);
  snprintf(line, sizeof(line), "Rate:%u/s", (unsigned)canPerSec);
  u8g2.drawStr(0, 54, line);
  u8g2.sendBuffer();
}

static void handleCommand(const String &line) {
  if (line.indexOf("\"cmd\":\"ping\"") >= 0) {
    bleSendLine("{\"type\":\"pong\",\"mode\":\"stream\"}");
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
      } else if (rxBuffer.length() < 512) {
        rxBuffer += c;
      }
    }
  }
};

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *pServer) {
    bleConnected = true;
    NimBLEDevice::startAdvertising();
    delay(30);
    bleSendLine("{\"type\":\"connected\",\"mode\":\"stream\"}");
  }
  void onDisconnect(NimBLEServer *pServer) {
    bleConnected = false;
    flushBatch();
    NimBLEDevice::startAdvertising();
  }
};

static void initBle() {
  NimBLEDevice::init(BLE_NAME);
  NimBLEDevice::setSecurityAuth(false, false, false);
  NimBLEDevice::setSecurityIOCap(3);
  NimBLEDevice::setMTU(247);
  NimBLEServer *server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  NimBLEService *svc = server->createService(NUS_SERVICE);
  NimBLECharacteristic *rx = svc->createCharacteristic(NUS_RX, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  rx->setCallbacks(new RxCallbacks());
  txChar = svc->createCharacteristic(NUS_TX, NIMBLE_PROPERTY::NOTIFY);
  svc->start();
  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(NUS_SERVICE);
  adv->setScanResponse(true);
  adv->start();
}

void setup() {
  Serial.begin(115200);
  u8g2.begin();
  u8g2.setContrast(220);
  initCan();
  initBle();
  lastSecMs = millis();
  lastFlushMs = millis();
  refreshOled();
}

void loop() {
  pollCan();
  uint32_t now = millis();
  if (now - lastSecMs >= 1000) {
    canPerSec = canThisSec;
    canThisSec = 0;
    lastSecMs = now;
  }
  if (bleConnected && (batchCount > 0) && (now - lastFlushMs >= BATCH_FLUSH_MS)) {
    flushBatch();
  }
  static uint32_t lastOled = 0;
  if (now - lastOled > 400) {
    lastOled = now;
    refreshOled();
  }
}
